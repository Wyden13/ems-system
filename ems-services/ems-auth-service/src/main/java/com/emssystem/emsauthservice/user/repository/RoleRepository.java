package com.emssystem.emsauthservice.user.repository;

import com.emssystem.emsauthservice.user.entity.AccountRole;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RoleRepository extends JpaRepository<AccountRole, UUID> {

}
