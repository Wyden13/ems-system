package com.emssystem.emsschedulingservice.scheduling.controller;
import com.emssystem.emsschedulingservice.scheduling.service.SchedulingOperations;
import com.emssystem.emsschedulingservice.scheduling.dto.request.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.*;
@RestController @RequestMapping("/api")
public class SchedulingApi {
 public record ShiftInput(@NotNull @Positive Long categoryId,@NotNull @Positive Long departmentId,@NotNull @Positive Long locationId,@NotNull Instant startsAt,@NotNull Instant endsAt,@Min(1) @Max(1000) int requiredEmployees,Long version){}
 public record Version(@NotNull @PositiveOrZero Long version){}
 public record Assignment(@NotNull @Positive Long employeeId,@NotNull @PositiveOrZero Long version){}
 public record Response(@NotNull String status,@NotNull @PositiveOrZero Long version){}
 private final SchedulingOperations service;
 public SchedulingApi(SchedulingOperations service){this.service=service;}
 @GetMapping("/shifts/options") public Object options(){return service.options();}
 @GetMapping("/shifts") public Object list(@RequestParam Instant from,@RequestParam Instant to){return service.list(from,to);}
 @GetMapping("/shifts/{id}") public Object get(@PathVariable long id){return service.get(id);}
 @PostMapping("/shifts") public Object create(@Valid @RequestBody ShiftInput input){return service.save(null,input);}
 @PutMapping("/shifts/{id}") public Object replace(@PathVariable long id,@Valid @RequestBody ShiftInput input){return service.save(id,input);}
 @PostMapping("/shifts/{id}/publish") public Object publish(@PathVariable long id,@Valid @RequestBody Version input){return service.publish(id,input.version());}
 @PostMapping("/shifts/{id}/cancel") public Object cancel(@PathVariable long id,@Valid @RequestBody Version input){return service.cancel(id,input.version());}
 @PostMapping("/shifts/{id}/assign") public Object assign(@PathVariable long id,@Valid @RequestBody Assignment input){return service.assign(id,input.employeeId(),input.version());}
 @PostMapping("/shifts/{id}/respond") public Object respond(@PathVariable long id,@Valid @RequestBody Response input){return service.respond(id,input.status(),input.version());}
 @PostMapping("/shift-assignments/{id}/cancel") public Object unassign(@PathVariable long id,@Valid @RequestBody Version input){return service.unassign(id,input.version());}
 @GetMapping("/shift-categories") public Object categories(){return service.categories();}
 @PostMapping("/shift-categories") public Object category(@Valid @RequestBody UpsertShiftCategoryRequest input){return service.category(null,input);}
 @PutMapping("/shift-categories/{id}") public Object category(@PathVariable long id,@Valid @RequestBody UpsertShiftCategoryRequest input){return service.category(id,input);}
 @PostMapping("/shift-categories/{id}/activate") public Object activate(@PathVariable long id){return service.categoryActive(id,true);}
 @PostMapping("/shift-categories/{id}/deactivate") public Object deactivate(@PathVariable long id){return service.categoryActive(id,false);}
 @GetMapping("/availability/me") public Object availability(){return service.availability();}
 @PostMapping("/availability") public Object availability(@Valid @RequestBody CreateAvailabilityRequest input){return service.saveAvailability(null,input);}
 @PutMapping("/availability/{id}") public Object availability(@PathVariable long id,@Valid @RequestBody CreateAvailabilityRequest input){return service.saveAvailability(id,input);}
 @DeleteMapping("/availability/{id}") public void deleteAvailability(@PathVariable long id){service.deleteAvailability(id);}
}
