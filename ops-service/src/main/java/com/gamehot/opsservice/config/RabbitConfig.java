package com.gamehot.opsservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    // ── Queue 名称常量 ──
    public static final String QUEUE_PUSH_SEND         = "ops.push.send";
    public static final String QUEUE_PUSH_SCHEDULED    = "ops.push.scheduled";
    public static final String QUEUE_RECALL_EXECUTE    = "ops.recall.execute";
    public static final String QUEUE_ALERT_NOTIFY      = "ops.alert.notify";
    public static final String QUEUE_DAILY_REPORT      = "ops.daily.report";
    public static final String QUEUE_FEISHU_NOTIFY     = "ops.feishu.notify";

    public static final String EXCHANGE_OPS = "ops.exchange";

    @Bean
    public DirectExchange opsExchange() {
        return new DirectExchange(EXCHANGE_OPS, true, false);
    }

    @Bean public Queue pushSendQueue()      { return QueueBuilder.durable(QUEUE_PUSH_SEND).build(); }
    @Bean public Queue pushScheduledQueue() { return QueueBuilder.durable(QUEUE_PUSH_SCHEDULED).build(); }
    @Bean public Queue recallExecuteQueue() { return QueueBuilder.durable(QUEUE_RECALL_EXECUTE).build(); }
    @Bean public Queue alertNotifyQueue()   { return QueueBuilder.durable(QUEUE_ALERT_NOTIFY).build(); }
    @Bean public Queue dailyReportQueue()   { return QueueBuilder.durable(QUEUE_DAILY_REPORT).build(); }
    @Bean public Queue feishuNotifyQueue()  { return QueueBuilder.durable(QUEUE_FEISHU_NOTIFY).build(); }

    @Bean public Binding pushSendBinding(Queue pushSendQueue, DirectExchange opsExchange) {
        return BindingBuilder.bind(pushSendQueue).to(opsExchange).with(QUEUE_PUSH_SEND);
    }
    @Bean public Binding pushScheduledBinding(Queue pushScheduledQueue, DirectExchange opsExchange) {
        return BindingBuilder.bind(pushScheduledQueue).to(opsExchange).with(QUEUE_PUSH_SCHEDULED);
    }
    @Bean public Binding recallExecuteBinding(Queue recallExecuteQueue, DirectExchange opsExchange) {
        return BindingBuilder.bind(recallExecuteQueue).to(opsExchange).with(QUEUE_RECALL_EXECUTE);
    }
    @Bean public Binding alertNotifyBinding(Queue alertNotifyQueue, DirectExchange opsExchange) {
        return BindingBuilder.bind(alertNotifyQueue).to(opsExchange).with(QUEUE_ALERT_NOTIFY);
    }
    @Bean public Binding dailyReportBinding(Queue dailyReportQueue, DirectExchange opsExchange) {
        return BindingBuilder.bind(dailyReportQueue).to(opsExchange).with(QUEUE_DAILY_REPORT);
    }
    @Bean public Binding feishuNotifyBinding(Queue feishuNotifyQueue, DirectExchange opsExchange) {
        return BindingBuilder.bind(feishuNotifyQueue).to(opsExchange).with(QUEUE_FEISHU_NOTIFY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter());
        return factory;
    }
}
