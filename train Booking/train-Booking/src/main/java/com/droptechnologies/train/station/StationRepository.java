package com.droptechnologies.train.station;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class StationRepository {

    private final JdbcTemplate jdbc;

    public StationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<StationSuggestion> suggest(String q, int limit) {
        String esc = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        String prefix = esc + "%";
        String contains = "%" + esc + "%";

        String sql = """
            SELECT code, name
            FROM stations
            WHERE code = ? OR name LIKE ? OR code LIKE ? OR name LIKE ?
            ORDER BY
                CASE WHEN code = ?     THEN 0
                     WHEN name LIKE ?  THEN 1
                     WHEN code LIKE ?  THEN 2
                     ELSE 3 END,
                name
            LIMIT ?
            """;

        return jdbc.query(sql,
                (rs, i) -> new StationSuggestion(rs.getString("code"), rs.getString("name")),
                q, prefix, prefix, contains,
                q, prefix, prefix,
                limit);
    }

	public boolean exists(String code) {
	    Integer n = jdbc.queryForObject(
	            "SELECT COUNT(*) FROM stations WHERE code = ?", Integer.class, code);
	    return n != null && n > 0;
	}
}