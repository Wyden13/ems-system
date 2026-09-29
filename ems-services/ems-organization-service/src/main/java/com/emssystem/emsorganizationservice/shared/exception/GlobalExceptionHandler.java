package com.emssystem.emsorganizationservice.shared.exception;

import com.emssystem.emsorganizationservice.shared.response.ApiErrorResponse;
import com.emssystem.emsorganizationservice.shared.validation.ValidationError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> notFound(ResourceNotFoundException exception,
                                                    HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND,
                exception.getMessage(), request, List.of());
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiErrorResponse> businessRule(BusinessRuleException exception,
                                                        HttpServletRequest request) {
        HttpStatus status = exception.getCode() == ErrorCode.CONFLICT
                ? HttpStatus.CONFLICT : HttpStatus.UNPROCESSABLE_CONTENT;
        return error(status, exception.getCode(), exception.getMessage(), request, List.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> databaseConflict(DataIntegrityViolationException exception,
                                                            HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ErrorCode.CONFLICT,
                "Operation conflicts with existing organization data", request, List.of());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> concurrentChange(OptimisticLockingFailureException exception,
                                                            HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, ErrorCode.CONFLICT,
                "Resource was changed by another request; reload and retry", request, List.of());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> invalidConstraint(ConstraintViolationException exception,
                                                             HttpServletRequest request) {
        List<ValidationError> errors = exception.getConstraintViolations().stream()
                .map(violation -> new ValidationError(
                        violation.getPropertyPath().toString(), violation.getMessage()))
                .toList();
        return error(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR,
                "Request validation failed", request, errors);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<ValidationError> errors = List.of();
        ErrorCode code = status.value() == 404 ? ErrorCode.RESOURCE_NOT_FOUND : ErrorCode.HTTP_ERROR;
        HttpStatus httpStatus = HttpStatus.resolve(status.value());
        String message = httpStatus == null ? "Request failed" : httpStatus.getReasonPhrase();
        if (status.is5xxServerError()) {
            code = ErrorCode.INTERNAL_ERROR;
            message = "An unexpected error occurred";
            log.error("Organization HTTP request failed", exception);
        } else if (status.value() == 400) {
            code = ErrorCode.VALIDATION_ERROR;
            if (exception instanceof MethodArgumentNotValidException validation) {
                message = "Request validation failed";
                errors = validation.getBindingResult().getFieldErrors().stream()
                        .map(field -> new ValidationError(field.getField(), field.getDefaultMessage()))
                        .toList();
            } else if (exception instanceof HandlerMethodValidationException validation) {
                message = "Request validation failed";
                errors = validation.getParameterValidationResults().stream()
                        .flatMap(result -> result.getResolvableErrors().stream().map(error ->
                                new ValidationError(error instanceof FieldError fieldError
                                        ? fieldError.getField() : result.getMethodParameter().getParameterName(),
                                        error.getDefaultMessage())))
                        .toList();
            } else if (exception instanceof MethodArgumentTypeMismatchException mismatch) {
                message = "Invalid request parameter";
                errors = List.of(new ValidationError(mismatch.getName(), "Must be a valid number"));
            } else if (exception instanceof HttpMessageNotReadableException) {
                message = "Malformed request body";
            }
        }
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.putAll(headers);
        responseHeaders.setContentType(MediaType.APPLICATION_JSON);
        String path = ((ServletWebRequest) request).getRequest().getRequestURI();
        ApiErrorResponse response = new ApiErrorResponse(
                Instant.now(), status.value(), code.name(), message, path, errors);
        return super.handleExceptionInternal(exception, response, responseHeaders, status, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> unexpected(Exception exception, HttpServletRequest request) {
        log.error("Organization request failed", exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR,
                "An unexpected error occurred", request, List.of());
    }

    private ResponseEntity<ApiErrorResponse> error(HttpStatus status, ErrorCode code, String message,
                                                  HttpServletRequest request, List<ValidationError> errors) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(
                Instant.now(), status.value(), code.name(), message, request.getRequestURI(), errors));
    }
}
