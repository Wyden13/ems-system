package com.emssystem.emsemployeeservice.employee;

import com.emssystem.emsemployeeservice.employee.service.EmployeeNumberGenerator;
import com.emssystem.emsemployeeservice.shared.exception.BusinessRuleException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class EmployeeNumberPostgresTest {
    private static final PostgreSQLContainer DATABASE = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static TransactionTemplate transactions;
    private static EmployeeNumberGenerator numbers;

    @BeforeAll
    static void start() {
        DATABASE.start();
        var dataSource = new DriverManagerDataSource(DATABASE.getJdbcUrl(), DATABASE.getUsername(),
                DATABASE.getPassword());
        jdbc = new JdbcTemplate(dataSource);
        transactions = new TransactionTemplate(new JdbcTransactionManager(dataSource));
        numbers = new EmployeeNumberGenerator(jdbc);
        Flyway.configure().dataSource(dataSource).load().migrate();
        jdbc.update("INSERT INTO locations(id,name) VALUES (1,'Edmonton')");
        jdbc.update("INSERT INTO departments(id,department_name,location_id) VALUES (1,'Operations',1)");
        jdbc.update(
                """
                        INSERT INTO employees(employee_number,first_name,last_name,email,hire_date,department_id,role,pay_rate,created_at)
                        VALUES ('000001','First','Employee','first@example.test',CURRENT_DATE,1,'EMPLOYEE',20,'2024-01-01'),
                               ('000002','Second','Employee','second@example.test',CURRENT_DATE,1,'EMPLOYEE',20,'2024-01-02')
                        """);
    }

    @AfterAll
    static void stop() {
        DATABASE.stop();
    }

    @BeforeEach
    void resetCounter() {
        jdbc.update("UPDATE employee_number_counter SET last_number = 2");
    }

    @Test
    void freshDatabasePreservesNumberSequenceAndDepartmentReferences() {
        assertEquals(java.util.List.of("000001", "000002"), jdbc.queryForList(
                "SELECT employee_number FROM employees ORDER BY created_at, id", String.class));
        assertEquals("000003", transactions.execute(status -> numbers.next()));
    }

    @Test
    void emptyDatabaseStartsAtOneAndFormattingCrossesDigitBoundaries() {
        jdbc.update("UPDATE employee_number_counter SET last_number = 0");
        assertEquals("000001", transactions.execute(status -> numbers.next()));
        jdbc.update("UPDATE employee_number_counter SET last_number = 9");
        assertEquals("000010", transactions.execute(status -> numbers.next()));
    }

    @Test
    void rollbackDoesNotConsumeNumberAndCounterSurvivesNewGenerator() {
        transactions.executeWithoutResult(status -> {
            assertEquals("000003", numbers.next());
            status.setRollbackOnly();
        });
        assertEquals("000003", transactions.execute(status -> new EmployeeNumberGenerator(jdbc).next()));
    }

    @Test
    void simultaneousAllocationsWaitForCommitAndStayUnique() throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var allocated = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var secondStarted = new CountDownLatch(1);
        try {
            var first = executor.submit(() -> transactions.execute(status -> {
                var number = numbers.next();
                allocated.countDown();
                try {
                    assertTrue(release.await(10, TimeUnit.SECONDS));
                } catch (InterruptedException ex) {
                    throw new RuntimeException(ex);
                }
                return number;
            }));
            assertTrue(allocated.await(10, TimeUnit.SECONDS));
            var second = executor.submit(() -> transactions.execute(status -> {
                secondStarted.countDown();
                return numbers.next();
            }));
            assertTrue(secondStarted.await(10, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> second.get(200, TimeUnit.MILLISECONDS));
            release.countDown();
            assertEquals("000003", first.get(10, TimeUnit.SECONDS));
            assertEquals("000004", second.get(10, TimeUnit.SECONDS));
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void refusesNumbersBeyondSixDigits() {
        jdbc.update("UPDATE employee_number_counter SET last_number = 999998");
        assertEquals("999999", transactions.execute(status -> numbers.next()));
        assertThrows(BusinessRuleException.class, () -> transactions.execute(status -> numbers.next()));
        assertEquals(999999L, jdbc.queryForObject("SELECT last_number FROM employee_number_counter", Long.class));
    }
}
