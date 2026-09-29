export interface WorkforcePerson { id:number; name:string; employeeNumber:string; departmentId:number; active:boolean; self:boolean }
export interface DepartmentOption { id:number; name:string; locationId:number; locationName:string; archived:boolean }
export interface ScheduleOptions { people:WorkforcePerson[]; departments:DepartmentOption[] }
export interface Category { id:number; name:string; color:string; defaultStartTime:string; defaultEndTime:string; active:boolean }
export interface Assignment { id:number; employeeId:number; status:string; version:number }
export interface Shift { id:number; shiftCategoryId:number; categoryName:string; departmentId:number|null; locationId:number; startsAt:string; endsAt:string; requiredEmployees:number; status:string; version:number; assignments:Assignment[] }
export interface Availability { id:number; dayOfWeek:string; startTime:string; endTime:string; type:string }
export interface PtoType { id:number; name:string; paid:boolean }
export interface Balance { id:number; ptoTypeId:number; ptoTypeName:string; accruedHours:number; usedHours:number; reservedHours:number; availableHours:number }
export interface LeaveRequest { id:number; employeeId:number; ptoTypeId:number; ptoTypeName:string; startDate:string; endDate:string; hours:number; status:string; version:number; operationError:string|null; comment:string|null }
export const processing = (status:string) => ['APPROVING','CANCELLING'].includes(status);
export const statusLabel = (status:string) => status==='APPROVING'?'Approval processing':status==='CANCELLING'?'Cancellation processing':status;
