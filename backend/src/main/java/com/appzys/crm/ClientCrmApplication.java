package com.appzys.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ClientCrmApplication {

    public static void main(String[] args) {
        SpringApplication.run(ClientCrmApplication.class, args);
        System.out.println("==================================================");
        System.out.println(" APPZYS Client Acquisition CRM Backend Started!   ");
        System.out.println(" Port: 8080 | API Base: http://localhost:8080/api ");
        System.out.println("==================================================");
    }
}
