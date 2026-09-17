package com.emssystem.emsauthservice.shared.exception;

import java.util.UUID;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(){
        super("User not found!");
    }
    public UserNotFoundException(String message){super(message);}
}
