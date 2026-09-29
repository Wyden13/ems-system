package com.emssystem.emsleaveservice.shared;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
public final class Rows {
 private Rows() {}
 public static List<Map<String,Object>> query(JdbcTemplate db,String sql,Object... args) {
  return db.query(sql,(rs,n)->{
   Map<String,Object> row=new LinkedHashMap<>();var meta=rs.getMetaData();
   for(int i=1;i<=meta.getColumnCount();i++){
    String[] parts=meta.getColumnLabel(i).split("_");String key=parts[0];
    for(int j=1;j<parts.length;j++)key+=Character.toUpperCase(parts[j].charAt(0))+parts[j].substring(1);
    Object v=rs.getObject(i);if(v instanceof java.sql.Timestamp t)v=t.toInstant();
    if(v instanceof java.sql.Date d)v=d.toLocalDate();if(v instanceof java.sql.Time t)v=t.toLocalTime();row.put(key,v);
   }return row;
  },args);
 }
 public static Map<String,Object> one(JdbcTemplate db,String sql,Object... args) {var rows=query(db,sql,args);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Record not found");return rows.get(0);}
 public static long id(Map<String,Object> r,String key) {return ((Number)r.get(key)).longValue();}
 public static void version(Map<String,Object> r,Long v) {if(v==null||id(r,"version")!=v)throw new ResponseStatusException(HttpStatus.CONFLICT,"This record changed. Refresh before saving.");}
}
