package com.gamehot.opsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(basePackages = {"com.gamehot.opsservice", "com.gamehot.common"})
@EnableAsync
@EnableScheduling
public class OpsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OpsServiceApplication.class, args);
    }
}
