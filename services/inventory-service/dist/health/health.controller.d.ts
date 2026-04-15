import { RabbitMQService } from '../rabbitmq.service';
export declare class HealthController {
    private rabbitmq;
    constructor(rabbitmq: RabbitMQService);
    check(): {
        service: string;
        status: string;
        port: string | number;
        rabbitmq: string;
    };
}
