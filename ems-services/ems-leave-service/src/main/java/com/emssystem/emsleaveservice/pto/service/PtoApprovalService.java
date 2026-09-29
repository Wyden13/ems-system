package com.emssystem.emsleaveservice.pto.service; import com.emssystem.emsleaveservice.pto.dto.request.ReviewPtoRequest; import com.emssystem.emsleaveservice.pto.dto.response.PtoRequestResponse; import java.util.UUID;
public interface PtoApprovalService{PtoRequestResponse review(UUID reviewer,Long requestId,ReviewPtoRequest request);}
