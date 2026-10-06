import java.sql.*;
import java.util.*;
import java.util.zip.GZIPInputStream;
import java.io.*;

/** One-off additive fixture import, using only the service database roles. */
public class CloudDemoImport {
    static String env(String name) { return Objects.requireNonNull(System.getenv(name), name + " missing"); }
    static Connection connect(String service) throws Exception {
        return DriverManager.getConnection("jdbc:postgresql://" + env("DB_HOST") + ":5432/ems_" + service + "_db?sslmode=require", service + "_user", env(service.toUpperCase() + "_PASSWORD"));
    }
    static String scalar(Connection c, String sql) throws Exception {
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { r.next(); return r.getString(1); }
    }
    static void validatePeople() throws Exception {
        try (Connection c = connect("people")) {
            c.setReadOnly(true);
            String[] rows = new String(Base64.getDecoder().decode(env("EXPECTED_PEOPLE")), java.nio.charset.StandardCharsets.UTF_8).split("\n");
            if (rows.length != 25) throw new IllegalStateException("Expected exactly 25 existing cloud-demo employees.");
            for (String row : rows) {
                String[] expected = row.split("\t");
                if (!expected[1].startsWith("cloud-demo.") || !expected[1].endsWith("@prairie.demo.test")) throw new IllegalStateException("Non-demo employee supplied.");
                try (PreparedStatement p = c.prepareStatement("select e.email,e.role,e.user_account_id::text,e.department_id,e.active,d.department_name,d.archived from employees e join departments d on d.id=e.department_id where e.id=?")) {
                    p.setLong(1, Long.parseLong(expected[0]));
                    try (ResultSet r = p.executeQuery()) {
                        if (!r.next() || !r.getString(1).equals(expected[1]) || !r.getString(2).equals(expected[2]) || !r.getString(3).equals(expected[3]) || r.getLong(4) != Long.parseLong(expected[4]) || !r.getBoolean(5) || !r.getString(6).startsWith("Cloud Demo · ") || r.getBoolean(7)) throw new IllegalStateException("Demo employee identity, link, or department changed; import refused.");
                    }
                }
            }
        }
    }
    public static void main(String[] args) throws Exception {
        Class.forName("org.postgresql.Driver");
        validatePeople();
        try (Connection c = connect("workforce")) {
            if (env("FIXTURE_MODE").equals("inspect")) {
                c.setReadOnly(true);
                System.out.println("INSPECTION " + scalar(c, "select json_build_object('shifts',(select count(*) from shifts),'assignments',(select count(*) from shift_assignments),'attendance',(select count(*) from time_entries),'ptoRequests',(select count(*) from pto_requests),'payrollRecords',(select count(*) from payroll_records),'migration',(select max(installed_rank) from flyway_schema_history where success),'ptoColumns',(select json_agg(column_name) from information_schema.columns where table_name='pto_requests'),'fixtureRunTable',to_regclass('cloud_demo_fixture_runs'))::text"));
                return;
            }
            c.setAutoCommit(false);
            try {
                try (Statement s = c.createStatement()) {
                    s.execute("set local lock_timeout='15s'; set local statement_timeout='120s'; select pg_advisory_xact_lock(hashtext('cloud-demo-prairie-operations')); select id from workforce_lock where id=1 for update; create table if not exists cloud_demo_fixture_runs(name text primary key, manifest jsonb not null, created_at timestamptz not null default now())");
                }
                String run = env("FIXTURE_RUN");
                try (PreparedStatement p = c.prepareStatement("select manifest::text from cloud_demo_fixture_runs where name=?")) {
                    p.setString(1, run);
                    try (ResultSet r = p.executeQuery()) {
                        if (r.next()) { System.out.println("EXISTING " + r.getString(1)); c.rollback(); return; }
                    }
                }
                StringBuilder encoded = new StringBuilder();
                for (int i = 0; i < Integer.parseInt(env("FIXTURE_PARTS")); i++) encoded.append(env("FIXTURE_SQL_GZIP_" + i));
                byte[] compressed = Base64.getDecoder().decode(encoded.toString());
                String sql;
                try (GZIPInputStream input = new GZIPInputStream(new ByteArrayInputStream(compressed))) {
                    byte[] bytes = input.readNBytes(10_000_001);
                    if (bytes.length > 10_000_000) throw new IllegalStateException("Fixture payload exceeds its limit.");
                    sql = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                }
                try (Statement s = c.createStatement()) { s.execute(sql); }
                String report;
                try (PreparedStatement p = c.prepareStatement("select manifest::text from cloud_demo_fixture_runs where name=?")) {
                    p.setString(1, run);
                    try (ResultSet r = p.executeQuery()) { if (!r.next()) throw new IllegalStateException("Fixture completion marker missing."); report = r.getString(1); }
                }
                c.commit();
                System.out.println("IMPORTED " + report);
            } catch (Exception failure) {
                c.rollback();
                throw failure;
            }
        }
    }
}
