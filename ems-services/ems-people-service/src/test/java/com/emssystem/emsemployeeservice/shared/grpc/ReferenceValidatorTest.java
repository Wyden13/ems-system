package com.emssystem.emsemployeeservice.shared.grpc;
import com.emssystem.contracts.v1.*;
import com.emssystem.emsorganizationservice.organization.repository.DepartmentRepository;
import com.emssystem.emsorganizationservice.organization.entity.*;
import io.grpc.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ReferenceValidatorTest {
 private final DepartmentRepository departments=mock(DepartmentRepository.class);
 private int accountCalls;
 private Channel accounts(Status failure) {
  return new Channel() {
   public String authority(){return "auth-test";}
   public <ReqT,RespT> ClientCall<ReqT,RespT> newCall(MethodDescriptor<ReqT,RespT> method,CallOptions options){
    assertNotNull(options.getDeadline());accountCalls++;
    return new ClientCall<>() {
     Listener<RespT> listener;
     public void start(Listener<RespT> listener,Metadata headers){this.listener=listener;}
     public void request(int count){} public void cancel(String message,Throwable cause){} public void sendMessage(ReqT request){}
     @SuppressWarnings("unchecked") public void halfClose(){
      if(failure!=null){listener.onClose(failure,new Metadata());return;}
      listener.onHeaders(new Metadata());listener.onMessage((RespT)AccountReference.newBuilder().setAccountId(UUID.randomUUID().toString()).build());listener.onClose(Status.OK,new Metadata());
     }
    };
   }
  };
 }
 private ReferenceValidator validator(boolean archived,Status failure){
  var department=new Department("Operations",new Location("Edmonton"));department.setArchived(archived);
  when(departments.findById(10L)).thenReturn(Optional.of(department));
  return new ReferenceValidator(AccountReferencesGrpc.newBlockingStub(accounts(failure)),departments);
 }
 @Test void departmentValidationIsLocalAndArchivedReferencesCanOnlyBeRetained(){
  var validator=validator(true,null);
  assertDoesNotThrow(()->validator.validate(10L,null,10L,null));
  var error=assertThrows(ReferenceValidator.ReferenceException.class,()->validator.validate(10L,null,null,null));
  assertEquals(400,error.status);assertEquals("departmentId",error.field);assertEquals(0,accountCalls);
 }
 @Test void missingDepartmentReturnsFieldErrorWithoutContactingAuth(){
  var validator=validator(false,null);when(departments.findById(10L)).thenReturn(Optional.empty());
  var error=assertThrows(ReferenceValidator.ReferenceException.class,()->validator.validate(10L,UUID.randomUUID(),null,null));
  assertEquals(400,error.status);assertEquals("departmentId",error.field);assertEquals(0,accountCalls);
 }
 @Test void newAccountIsValidatedAndExistingAccountDoesNotRequireRemoteAvailability(){
  UUID id=UUID.randomUUID();var validator=validator(false,null);validator.validate(10L,id,null,null);assertEquals(1,accountCalls);
  validator=validator(false,Status.UNAVAILABLE);assertDoesNotThrow(()->validator(false,Status.UNAVAILABLE).validate(10L,id,10L,id));assertEquals(1,accountCalls);
 }
 @Test void missingAccountAndAuthFailureHaveDifferentErrors(){
  var missing=assertThrows(ReferenceValidator.ReferenceException.class,()->validator(false,Status.NOT_FOUND).validate(10L,UUID.randomUUID(),null,null));assertEquals(400,missing.status);assertEquals("userAccountId",missing.field);
  var unavailable=assertThrows(ReferenceValidator.ReferenceException.class,()->validator(false,Status.UNAVAILABLE).validate(10L,UUID.randomUUID(),null,null));assertEquals(503,unavailable.status);
 }
}
