import { metrics } from "@opentelemetry/api";

export function getMeter(name = "app") {
	return metrics.getMeter(name);
}
