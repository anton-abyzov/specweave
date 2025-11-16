var KafkaPlatform = /* @__PURE__ */ ((KafkaPlatform2) => {
  KafkaPlatform2["APACHE_KAFKA"] = "apache-kafka";
  KafkaPlatform2["AWS_MSK"] = "aws-msk";
  KafkaPlatform2["AZURE_EVENT_HUBS"] = "azure-event-hubs";
  KafkaPlatform2["CONFLUENT_CLOUD"] = "confluent-cloud";
  return KafkaPlatform2;
})(KafkaPlatform || {});
class PlatformAdapterFactory {
  static create(platform) {
    switch (platform) {
      case "apache-kafka" /* APACHE_KAFKA */:
        const { ApacheKafkaAdapter } = require("./apache-kafka-adapter");
        return new ApacheKafkaAdapter();
      case "aws-msk" /* AWS_MSK */:
        const { AwsMskAdapter } = require("./aws-msk-adapter");
        return new AwsMskAdapter();
      case "azure-event-hubs" /* AZURE_EVENT_HUBS */:
        const { AzureEventHubsAdapter } = require("./azure-event-hubs-adapter");
        return new AzureEventHubsAdapter();
      case "confluent-cloud" /* CONFLUENT_CLOUD */:
        const { ConfluentCloudAdapter } = require("./confluent-cloud-adapter");
        return new ConfluentCloudAdapter();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
  /**
   * Auto-detect platform based on connection config
   */
  static detectPlatform(config) {
    const broker = config.brokers[0].toLowerCase();
    if (broker.includes(".kafka.") && broker.includes(".amazonaws.com")) {
      return "aws-msk" /* AWS_MSK */;
    }
    if (broker.includes(".servicebus.windows.net")) {
      return "azure-event-hubs" /* AZURE_EVENT_HUBS */;
    }
    if (broker.includes(".confluent.cloud") || broker.includes(".gcp.confluent.cloud")) {
      return "confluent-cloud" /* CONFLUENT_CLOUD */;
    }
    return "apache-kafka" /* APACHE_KAFKA */;
  }
}
export {
  KafkaPlatform,
  PlatformAdapterFactory
};
