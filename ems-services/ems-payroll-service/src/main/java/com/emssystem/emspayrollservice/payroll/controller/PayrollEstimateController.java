package com.emssystem.emspayrollservice.payroll.controller;
import com.emssystem.emspayrollservice.payroll.service.PayrollEstimateService;
import org.springframework.web.bind.annotation.*;
import java.time.*;
@RestController @RequestMapping("/api/payroll/estimates")
public class PayrollEstimateController {
 private final PayrollEstimateService service;
 public PayrollEstimateController(PayrollEstimateService service){this.service=service;}
 @GetMapping public PayrollEstimateService.Report estimates(@RequestParam(required=false) LocalDate periodStart,@RequestParam(required=false) Long employeeId){return service.report(periodStart,employeeId);}
}
