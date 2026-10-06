import java.sql.*;

/** Provisions service databases and synchronizes application roles with AWS secrets. */
public class Provision {
    static String env(String key) { return System.getenv(key); }
    static String literal(String s) { return "'" + s.replace("'", "''") + "'"; }
    static boolean exists(Connection c, String sql, String value) throws Exception {
        try (PreparedStatement p = c.prepareStatement(sql)) {
            p.setString(1, value);
            try (ResultSet r = p.executeQuery()) { return r.next(); }
        }
    }
    public static void main(String[] args) throws Exception {
        Class.forName("org.postgresql.Driver");
        String base = "jdbc:postgresql://" + env("DB_HOST") + ":5432/";
        try (Connection c = DriverManager.getConnection(base + "postgres?sslmode=require", "postgres", env("ADMIN_PASSWORD"))) {
            for (String service : new String[]{"auth", "people", "workforce"}) {
                String role = service + "_user", db = "ems_" + service + "_db";
                String password = env(service.toUpperCase() + "_PASSWORD");
                try (Statement s = c.createStatement()) {
                    if (!exists(c, "SELECT 1 FROM pg_roles WHERE rolname=?", role)) {
                        s.execute("CREATE ROLE " + role + " LOGIN PASSWORD " + literal(password));
                    } else {
                        s.execute("ALTER ROLE " + role + " LOGIN PASSWORD " + literal(password));
                    }
                    if (!exists(c, "SELECT 1 FROM pg_database WHERE datname=?", db)) {
                        s.execute("CREATE DATABASE " + db + " OWNER " + role);
                    }
                    s.execute("GRANT CONNECT ON DATABASE " + db + " TO " + role);
                }
                try (Connection app = DriverManager.getConnection(base + db + "?sslmode=require", role, password)) {
                    System.out.println(service + ": database credentials verified");
                }
                try (Connection admin = DriverManager.getConnection(base + db + "?sslmode=require", "postgres", env("ADMIN_PASSWORD")); Statement s = admin.createStatement()) {
                    s.execute("GRANT ALL ON SCHEMA public TO " + role);
                    // Transfer only tables in this service's dedicated database from the bootstrap administrator.
                    try (ResultSet r = s.executeQuery("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tableowner='postgres'")) {
                        java.util.List<String> tables = new java.util.ArrayList<>();
                        while (r.next()) tables.add(r.getString(1));
                        for (String table : tables) try (Statement ddl = admin.createStatement()) {
                            ddl.execute("ALTER TABLE public.\"" + table.replace("\"", "\"\"") + "\" OWNER TO " + role);
                        }
                    }
                    s.execute("GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO " + role);
                }
            }
        }
        System.out.println("Database provisioning completed");
    }
}
