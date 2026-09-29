package com.emssystem.emsleaveservice.pto.repository; import com.emssystem.emsleaveservice.pto.entity.PtoLedgerEntry; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface PtoLedgerRepository extends JpaRepository<PtoLedgerEntry,Long>{List<PtoLedgerEntry> findByEmployeeIdAndPtoTypeIdOrderByOccurredAt(Long employeeId,Long typeId);}
