package com.emssystem.emsauthservice.shared.exception;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestControllerAdvice
public class GlobalExceptionHandler {
    private ResponseEntity<Map<String,Object>> error(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("status",status,"message",message));
    }
    @ExceptionHandler({EmailAlreadyExistsException.class,org.springframework.dao.DataIntegrityViolationException.class})
    public ResponseEntity<?> conflict(Exception e) { return error(409,"Account conflicts with existing data"); }
    @ExceptionHandler(UserNotFoundException.class) public ResponseEntity<?> missing(Exception e) { return error(404,"Account not found"); }
    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<?> authentication(Exception e) { return error(401,"Invalid credentials or expired session"); }
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<?> denied(Exception e) { return error(403,"Access denied"); }
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<?> status(org.springframework.web.server.ResponseStatusException e) { return error(e.getStatusCode().value(),e.getReason()==null?"Request failed":e.getReason()); }
    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(org.springframework.web.bind.MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(Map.of("message","Check the highlighted fields","errors",e.getBindingResult().getFieldErrors().stream().map(f -> Map.of("field",f.getField(),"message",Objects.toString(f.getDefaultMessage(),"Invalid value"))).toList()));
    }
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class})
    public ResponseEntity<?> invalid(Exception e) { return error(400,e instanceof IllegalArgumentException?e.getMessage():"Invalid request body"); }
}
