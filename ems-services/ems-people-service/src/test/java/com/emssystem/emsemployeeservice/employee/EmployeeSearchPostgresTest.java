package com.emssystem.emsemployeeservice.employee;

import com.emssystem.emsemployeeservice.employee.repository.EmployeeRepository;
import com.emssystem.emsemployeeservice.employee.service.EmployeeService;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class EmployeeSearchPostgresTest {
    private static final PostgreSQLContainer DATABASE = new PostgreSQLContainer("postgres:18-alpine");
    private static LocalContainerEntityManagerFactoryBean factory;
    private static EntityManager manager;
    private static EmployeeService service;
    private static int employeeNumber;
    private static JdbcTemplate jdbc;

    @BeforeAll
    static void start() {
        DATABASE.start();
        var source = new DriverManagerDataSource(DATABASE.getJdbcUrl(), DATABASE.getUsername(), DATABASE.getPassword());
        Flyway.configure().dataSource(source).load().migrate();
        jdbc = new JdbcTemplate(source);
        jdbc.update("INSERT INTO locations(id,name) VALUES (1,'Edmonton')");
        jdbc.update(
                "INSERT INTO departments(id,department_name,location_id) VALUES (1,'Operations',1),(2,'Support',1)");
        factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(source);
        factory.setPackagesToScan("com.emssystem.emsemployeeservice.employee.entity");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate"));
        factory.afterPropertiesSet();
        manager = factory.getObject().createEntityManager();
        var repository = new JpaRepositoryFactory(manager).getRepository(EmployeeRepository.class);
        service = new EmployeeService(repository, null, null);
        for (int i = 0; i < 25; i++)
            seed("Alex", "Senior Technician", 1L, true);
        seed("Alex", "Technician", 2L, true);
        seed("Alex", "TECHNICIAN", 1L, false);
        seed("Alex", "Coordinator", 1L, true);
        seed("Jamie", "Technician", 1L, true);
        seed("Literal", "Tech_100% Lead", 1L, true);
        seed("Other", "TechX100Y Lead", 1L, true);
        seed("Unknown", null, 1L, true);
    }

    private static void seed(String firstName, String title, Long department, boolean active) {
        String number = String.format("%06d", ++employeeNumber);
        jdbc.update(
                """
                        INSERT INTO employees(employee_number,first_name,last_name,email,hire_date,department_id,role,pay_rate,job_title,active,created_at,updated_at,version)
                        VALUES (?,?,?,?,'2024-01-01',?,'EMPLOYEE',25,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,0)
                        """,
                number, firstName, "Employee " + number, number + "@example.test", department, title, active);
    }

    @AfterAll
    static void stop() {
        if (manager != null)
            manager.close();
        if (factory != null)
            factory.destroy();
        DATABASE.stop();
    }

    @Test
    void titleFilterCombinesWithSearchStatusAndDepartmentBeforePagination() {
        var page = service.search(true, 1L, "alex", "  tEcHnIcIaN  ", PageRequest.of(1, 20, Sort.by("lastName")));
        assertEquals(25, page.getTotalElements());
        assertEquals(2, page.getTotalPages());
        assertEquals(5, page.getNumberOfElements());
        assertTrue(page.stream().allMatch(employee -> employee.jobTitle().equals("Senior Technician")
                && employee.active() && employee.departmentId() == 1L));
    }

    @Test
    void titleFilterTreatsWildcardsLiterallyAndExcludesMissingTitles() {
        var page = service.search(null, null, null, "Tech_100%", PageRequest.of(0, 20));
        assertEquals(1, page.getTotalElements());
        assertEquals("Tech_100% Lead", page.getContent().get(0).jobTitle());
    }

    @Test
    void emptyTitleFilterKeepsExistingDirectoryBehavior() {
        var page = service.search(null, null, null, "  ", PageRequest.of(0, 20));
        assertEquals(32, page.getTotalElements());
        assertEquals(20, page.getNumberOfElements());
    }
}
