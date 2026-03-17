package com.gamehot.opsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class OpsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OpsServiceApplication.class, args);
    }
}
