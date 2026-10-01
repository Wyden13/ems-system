package com.emssystem.emsemployeeservice.shared.exception;

import com.emssystem.emsemployeeservice.employee.exception.EmployeeEmailAlreadyExistsException;
import com.emssystem.emsemployeeservice.employee.exception.EmployeeNotFoundException;
import com.emssystem.emsemployeeservice.employee.exception.EmployeeNumberAlreadyExistsException;
import com.emssystem.emsemployeeservice.employee.exception.UserAccountAlreadyLinkedException;
import com.emssystem.emsemployeeservice.shared.response.ApiErrorResponse;
import com.emssystem.emsemployeeservice.shared.validation.ValidationError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

@RestControllerAdvice(basePackages = "com.emssystem.emsemployeeservice")
@org.springframework.core.annotation.Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler {
        @ExceptionHandler(com.emssystem.emsemployeeservice.shared.grpc.ReferenceValidator.ReferenceException.class)
        public ResponseEntity<?> reference(
                        com.emssystem.emsemployeeservice.shared.grpc.ReferenceValidator.ReferenceException ex) {
                return ResponseEntity.status(ex.status).body(java.util.Map.of("message", ex.getMessage(), "errors",
                                List.of(java.util.Map.of("field", ex.field, "message", ex.getMessage()))));
        }

        private final Clock clock;

        public GlobalExceptionHandler(Clock clock) {
                this.clock = clock;
        }

        @ExceptionHandler(EmployeeNotFoundException.class)
        public ResponseEntity<ApiErrorResponse> handleNotFound(EmployeeNotFoundException exception,
                        HttpServletRequest request) {
                return error(HttpStatus.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND,
                                exception.getMessage(), request, List.of());
        }

        @ExceptionHandler({ EmployeeNumberAlreadyExistsException.class,
                        EmployeeEmailAlreadyExistsException.class,
                        UserAccountAlreadyLinkedException.class })
        public ResponseEntity<ApiErrorResponse> handleConflict(Exception exception,
                        HttpServletRequest request) {
                return error(HttpStatus.CONFLICT, ErrorCode.CONFLICT,
                                exception.getMessage(), request, List.of());
        }

        @ExceptionHandler(DataIntegrityViolationException.class)
        public ResponseEntity<ApiErrorResponse> handleDatabaseConflict(DataIntegrityViolationException exception,
                        HttpServletRequest request) {
                return error(HttpStatus.CONFLICT, ErrorCode.CONFLICT,
                                "Employee conflicts with existing data", request, List.of());
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiErrorResponse> handleBodyValidation(MethodArgumentNotValidException exception,
                        HttpServletRequest request) {
                List<ValidationError> errors = exception.getBindingResult().getFieldErrors().stream()
                                .map(error -> new ValidationError(error.getField(), error.getDefaultMessage()))
                                .toList();
                return error(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR,
                                "Request validation failed", request, errors);
        }

        @ExceptionHandler(ConstraintViolationException.class)
        public ResponseEntity<ApiErrorResponse> handleConstraintValidation(ConstraintViolationException exception,
                        HttpServletRequest request) {
                List<ValidationError> errors = exception.getConstraintViolations().stream()
                                .map(violation -> new ValidationError(
                                                violation.getPropertyPath().toString(), violation.getMessage()))
                                .toList();
                return error(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR,
                                "Request validation failed", request, errors);
        }

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException exception,
                        HttpServletRequest request) {
                return error(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR,
                                "Malformed request body", request, List.of());
        }

        @ExceptionHandler(BusinessRuleException.class)
        public ResponseEntity<ApiErrorResponse> handleBusinessRule(BusinessRuleException exception,
                        HttpServletRequest request) {
                return error(HttpStatus.UNPROCESSABLE_ENTITY, exception.getCode(),
                                exception.getMessage(), request, List.of());
        }

        private ResponseEntity<ApiErrorResponse> error(HttpStatus status, ErrorCode code, String message,
                        HttpServletRequest request,
                        List<ValidationError> validationErrors) {
                ApiErrorResponse response = new ApiErrorResponse(
                                Instant.now(clock), status.value(), code.name(), message,
                                request.getRequestURI(), validationErrors);
                return ResponseEntity.status(status).body(response);
        }
}
