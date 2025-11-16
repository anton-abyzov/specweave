/**
 * Advanced ksqlDB Patterns
 *
 * Complex joins, User-Defined Functions (UDFs), custom aggregations, and advanced SQL patterns
 *
 * @module advanced-ksqldb-patterns
 */

/**
 * Join Pattern Types
 */
export enum JoinPattern {
  /** Stream-Stream Join (time-windowed) */
  STREAM_STREAM = 'stream-stream',
  /** Stream-Table Join (enrichment) */
  STREAM_TABLE = 'stream-table',
  /** Table-Table Join (materialized view) */
  TABLE_TABLE = 'table-table',
  /** Multi-way Join (3+ sources) */
  MULTI_WAY = 'multi-way',
  /** Self-Join (correlation) */
  SELF_JOIN = 'self-join',
}

/**
 * Aggregation Pattern Types
 */
export enum AggregationPattern {
  /** Simple aggregation (count, sum, avg) */
  SIMPLE = 'simple',
  /** Session-based aggregation */
  SESSION = 'session',
  /** Hopping window aggregation */
  HOPPING = 'hopping',
  /** Tumbling window aggregation */
  TUMBLING = 'tumbling',
  /** Custom UDF aggregation */
  CUSTOM_UDF = 'custom-udf',
}

/**
 * ksqlDB Query Builder
 *
 * Generates optimized ksqlDB queries for complex patterns
 */
export class KsqlDBQueryBuilder {
  /**
   * Generate stream-stream join query
   *
   * Use case: Join two event streams within a time window (e.g., clicks + purchases)
   */
  static generateStreamStreamJoin(options: {
    leftStream: string;
    rightStream: string;
    joinKey: string;
    windowSizeMinutes: number;
    outputStream: string;
    selectFields: string[];
  }): string {
    return `
-- Stream-Stream Join (time-windowed)
CREATE STREAM ${options.outputStream} AS
SELECT
  ${options.selectFields.join(',\n  ')}
FROM ${options.leftStream} L
INNER JOIN ${options.rightStream} R
  WITHIN ${options.windowSizeMinutes} MINUTES
  ON L.${options.joinKey} = R.${options.joinKey}
EMIT CHANGES;

/* Example Output:
 * Left stream: clicks (user_id, page, timestamp)
 * Right stream: purchases (user_id, product, amount, timestamp)
 * Join: Match clicks within 30 minutes of purchase
 * Result: User journey (click → purchase conversion)
 */
`.trim();
  }

  /**
   * Generate stream-table join query
   *
   * Use case: Enrich stream with reference data (e.g., user profile lookup)
   */
  static generateStreamTableJoin(options: {
    stream: string;
    table: string;
    joinKey: string;
    outputStream: string;
    selectFields: string[];
  }): string {
    return `
-- Stream-Table Join (enrichment)
CREATE STREAM ${options.outputStream} AS
SELECT
  ${options.selectFields.join(',\n  ')}
FROM ${options.stream} S
LEFT JOIN ${options.table} T
  ON S.${options.joinKey} = T.${options.joinKey}
EMIT CHANGES;

/* Example Output:
 * Stream: orders (order_id, user_id, amount)
 * Table: users (user_id, name, email, tier)
 * Result: Enriched orders with user metadata
 * Note: Table must be keyed on join key!
 */
`.trim();
  }

  /**
   * Generate table-table join query
   *
   * Use case: Create materialized view of joined tables
   */
  static generateTableTableJoin(options: {
    leftTable: string;
    rightTable: string;
    joinKey: string;
    outputTable: string;
    selectFields: string[];
  }): string {
    return `
-- Table-Table Join (materialized view)
CREATE TABLE ${options.outputTable} AS
SELECT
  ${options.selectFields.join(',\n  ')}
FROM ${options.leftTable} L
INNER JOIN ${options.rightTable} R
  ON L.${options.joinKey} = R.${options.joinKey};

/* Example Output:
 * Left table: customer_profiles (customer_id, name, email)
 * Right table: customer_preferences (customer_id, category, value)
 * Result: Unified customer view (profile + preferences)
 * Note: Both tables must be keyed on join key!
 */
`.trim();
  }

  /**
   * Generate multi-way join query
   *
   * Use case: Join 3+ streams/tables (e.g., clicks + cart + purchase)
   */
  static generateMultiWayJoin(options: {
    streams: Array<{ name: string; alias: string }>;
    joinKey: string;
    windowSizeMinutes?: number;
    outputStream: string;
    selectFields: string[];
  }): string {
    if (options.streams.length < 3) {
      throw new Error('Multi-way join requires at least 3 streams');
    }

    const baseStream = options.streams[0];
    const joinClauses = options.streams.slice(1).map((stream, index) => {
      const within = options.windowSizeMinutes
        ? `WITHIN ${options.windowSizeMinutes} MINUTES`
        : '';
      return `INNER JOIN ${stream.name} ${stream.alias} ${within}
  ON ${baseStream.alias}.${options.joinKey} = ${stream.alias}.${options.joinKey}`;
    });

    return `
-- Multi-Way Join (3+ streams)
CREATE STREAM ${options.outputStream} AS
SELECT
  ${options.selectFields.join(',\n  ')}
FROM ${baseStream.name} ${baseStream.alias}
${joinClauses.join('\n')}
EMIT CHANGES;

/* Example Output:
 * Stream 1: clicks (user_id, page)
 * Stream 2: add_to_cart (user_id, product)
 * Stream 3: purchases (user_id, order_id)
 * Result: Full funnel (click → cart → purchase)
 */
`.trim();
  }

  /**
   * Generate session window aggregation
   *
   * Use case: Group events by user session (e.g., website activity)
   */
  static generateSessionAggregation(options: {
    inputStream: string;
    groupByKey: string;
    sessionGapMinutes: number;
    aggregations: Array<{ func: string; column: string; alias: string }>;
    outputTable: string;
  }): string {
    const aggFields = options.aggregations
      .map((agg) => `${agg.func}(${agg.column}) AS ${agg.alias}`)
      .join(',\n  ');

    return `
-- Session Window Aggregation
CREATE TABLE ${options.outputTable} AS
SELECT
  ${options.groupByKey},
  ${aggFields}
FROM ${options.inputStream}
WINDOW SESSION (${options.sessionGapMinutes} MINUTES)
GROUP BY ${options.groupByKey}
EMIT CHANGES;

/* Example Output:
 * Input: page_views (user_id, page, timestamp)
 * Session gap: 30 minutes of inactivity
 * Aggregations:
 *   - COUNT(*) AS page_count
 *   - COLLECT_LIST(page) AS pages_visited
 *   - EARLIEST_BY_OFFSET(timestamp) AS session_start
 *   - LATEST_BY_OFFSET(timestamp) AS session_end
 * Result: User sessions with duration and page count
 */
`.trim();
  }

  /**
   * Generate hopping window aggregation
   *
   * Use case: Overlapping time windows (e.g., 5-minute windows every 1 minute)
   */
  static generateHoppingAggregation(options: {
    inputStream: string;
    groupByKey: string;
    windowSizeMinutes: number;
    advanceByMinutes: number;
    aggregations: Array<{ func: string; column: string; alias: string }>;
    outputTable: string;
  }): string {
    const aggFields = options.aggregations
      .map((agg) => `${agg.func}(${agg.column}) AS ${agg.alias}`)
      .join(',\n  ');

    return `
-- Hopping Window Aggregation
CREATE TABLE ${options.outputTable} AS
SELECT
  ${options.groupByKey},
  WINDOWSTART AS window_start,
  WINDOWEND AS window_end,
  ${aggFields}
FROM ${options.inputStream}
WINDOW HOPPING (SIZE ${options.windowSizeMinutes} MINUTES, ADVANCE BY ${options.advanceByMinutes} MINUTES)
GROUP BY ${options.groupByKey}
EMIT CHANGES;

/* Example Output:
 * Input: sensor_data (sensor_id, temperature, timestamp)
 * Window: 5 minutes, advance 1 minute (80% overlap)
 * Aggregations:
 *   - AVG(temperature) AS avg_temp
 *   - MAX(temperature) AS max_temp
 *   - STDDEV(temperature) AS temp_stddev
 * Use case: Sliding window anomaly detection
 */
`.trim();
  }

  /**
   * Generate tumbling window aggregation
   *
   * Use case: Non-overlapping time windows (e.g., hourly totals)
   */
  static generateTumblingAggregation(options: {
    inputStream: string;
    groupByKey: string;
    windowSizeMinutes: number;
    aggregations: Array<{ func: string; column: string; alias: string }>;
    outputTable: string;
  }): string {
    const aggFields = options.aggregations
      .map((agg) => `${agg.func}(${agg.column}) AS ${agg.alias}`)
      .join(',\n  ');

    return `
-- Tumbling Window Aggregation
CREATE TABLE ${options.outputTable} AS
SELECT
  ${options.groupByKey},
  WINDOWSTART AS window_start,
  WINDOWEND AS window_end,
  ${aggFields}
FROM ${options.inputStream}
WINDOW TUMBLING (SIZE ${options.windowSizeMinutes} MINUTES)
GROUP BY ${options.groupByKey}
EMIT CHANGES;

/* Example Output:
 * Input: transactions (merchant_id, amount, timestamp)
 * Window: 60 minutes (non-overlapping hourly windows)
 * Aggregations:
 *   - COUNT(*) AS transaction_count
 *   - SUM(amount) AS total_revenue
 *   - AVG(amount) AS avg_transaction_value
 * Use case: Hourly sales reports
 */
`.trim();
  }

  /**
   * Generate custom UDF aggregation
   *
   * Use case: Complex business logic (e.g., weighted average, percentiles)
   */
  static generateCustomUDFQuery(options: {
    inputStream: string;
    udfName: string;
    udfParameters: string[];
    groupByKey?: string;
    outputStream: string;
  }): string {
    const params = options.udfParameters.join(', ');
    const groupBy = options.groupByKey ? `GROUP BY ${options.groupByKey}` : '';

    return `
-- Custom UDF Query
CREATE STREAM ${options.outputStream} AS
SELECT
  ${options.groupByKey ? `${options.groupByKey},` : ''}
  ${options.udfName}(${params}) AS result
FROM ${options.inputStream}
${groupBy}
EMIT CHANGES;

/* Example UDF (Java):
 * @UdfDescription(name = "weighted_avg", description = "Calculates weighted average")
 * public class WeightedAvgUDF {
 *   @Udf(description = "weighted_avg(value, weight)")
 *   public double weightedAvg(double value, double weight) {
 *     // Custom aggregation logic
 *   }
 * }
 *
 * Usage:
 * SELECT weighted_avg(price, quantity) AS avg_price FROM orders;
 */
`.trim();
  }
}

/**
 * ksqlDB UDF Generator
 *
 * Generates Java UDF code templates
 */
export class KsqlDBUDFGenerator {
  /**
   * Generate scalar UDF template
   */
  static generateScalarUDF(options: {
    udfName: string;
    description: string;
    parameters: Array<{ name: string; type: string }>;
    returnType: string;
  }): string {
    const params = options.parameters
      .map((p) => `final ${p.type} ${p.name}`)
      .join(', ');

    return `
package com.example.ksqldb.udf;

import io.confluent.ksql.function.udf.Udf;
import io.confluent.ksql.function.udf.UdfDescription;

@UdfDescription(
  name = "${options.udfName}",
  description = "${options.description}"
)
public class ${this.toPascalCase(options.udfName)}UDF {

  @Udf(description = "${options.description}")
  public ${options.returnType} ${options.udfName}(${params}) {
    // TODO: Implement UDF logic
    return null;
  }
}

/* Deployment:
 * 1. Build JAR: mvn clean package
 * 2. Copy to ksqlDB extensions: /usr/share/java/ksqldb-server/ext/
 * 3. Restart ksqlDB server
 * 4. Test: SHOW FUNCTIONS;
 */
`.trim();
  }

  /**
   * Generate UDAF (User-Defined Aggregate Function) template
   */
  static generateUDAF(options: {
    udafName: string;
    description: string;
    inputType: string;
    aggregateType: string;
    returnType: string;
  }): string {
    return `
package com.example.ksqldb.udaf;

import io.confluent.ksql.function.udaf.Udaf;
import io.confluent.ksql.function.udaf.UdafDescription;
import io.confluent.ksql.function.udaf.UdafFactory;

@UdafDescription(
  name = "${options.udafName}",
  description = "${options.description}"
)
public class ${this.toPascalCase(options.udafName)}UDAF {

  @UdafFactory(description = "${options.description}")
  public static Udaf<${options.inputType}, ${options.aggregateType}, ${options.returnType}> create${this.toPascalCase(options.udafName)}() {
    return new Udaf<${options.inputType}, ${options.aggregateType}, ${options.returnType}>() {

      @Override
      public ${options.aggregateType} initialize() {
        // Initialize aggregate state
        return null; // TODO
      }

      @Override
      public ${options.aggregateType} aggregate(${options.inputType} newValue, ${options.aggregateType} aggregate) {
        // Add new value to aggregate
        return aggregate; // TODO
      }

      @Override
      public ${options.aggregateType} merge(${options.aggregateType} agg1, ${options.aggregateType} agg2) {
        // Merge two aggregates (for parallel processing)
        return agg1; // TODO
      }

      @Override
      public ${options.returnType} map(${options.aggregateType} aggregate) {
        // Convert aggregate to return type
        return null; // TODO
      }
    };
  }
}

/* Example Usage (ksqlDB):
 * CREATE TABLE aggregated AS
 * SELECT
 *   key,
 *   ${options.udafName}(value) AS result
 * FROM input_stream
 * GROUP BY key;
 */
`.trim();
  }

  private static toPascalCase(str: string): string {
    return str
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}

/**
 * Example Usage: Stream-Stream Join
 *
 * ```typescript
 * const joinQuery = KsqlDBQueryBuilder.generateStreamStreamJoin({
 *   leftStream: 'clicks',
 *   rightStream: 'purchases',
 *   joinKey: 'user_id',
 *   windowSizeMinutes: 30,
 *   outputStream: 'click_to_purchase',
 *   selectFields: [
 *     'L.user_id',
 *     'L.page AS clicked_page',
 *     'R.product AS purchased_product',
 *     'R.amount'
 *   ],
 * });
 * console.log(joinQuery);
 * ```
 */

/**
 * Example Usage: Session Window Aggregation
 *
 * ```typescript
 * const sessionQuery = KsqlDBQueryBuilder.generateSessionAggregation({
 *   inputStream: 'page_views',
 *   groupByKey: 'user_id',
 *   sessionGapMinutes: 30,
 *   outputTable: 'user_sessions',
 *   aggregations: [
 *     { func: 'COUNT', column: '*', alias: 'page_count' },
 *     { func: 'COLLECT_LIST', column: 'page', alias: 'pages' },
 *     { func: 'EARLIEST_BY_OFFSET', column: 'timestamp', alias: 'session_start' },
 *     { func: 'LATEST_BY_OFFSET', column: 'timestamp', alias: 'session_end' },
 *   ],
 * });
 * console.log(sessionQuery);
 * ```
 */

/**
 * Example Usage: Custom UDAF
 *
 * ```typescript
 * const udafCode = KsqlDBUDFGenerator.generateUDAF({
 *   udafName: 'percentile',
 *   description: 'Calculate 95th percentile',
 *   inputType: 'Double',
 *   aggregateType: 'List<Double>',
 *   returnType: 'Double',
 * });
 * // Write to src/main/java/com/example/ksqldb/udaf/PercentileUDAF.java
 * ```
 */

/**
 * Advanced ksqlDB Best Practices:
 *
 * **Join Performance**:
 * - Use smallest window size possible (reduces state size)
 * - Stream-table joins are faster than stream-stream joins
 * - Ensure join keys have same partitioning (co-partitioning)
 * - Use LEFT JOIN to avoid dropping unmatched records
 *
 * **Windowing**:
 * - Session windows: User sessions, click streams (gap-based)
 * - Tumbling windows: Hourly/daily totals (non-overlapping)
 * - Hopping windows: Real-time anomaly detection (overlapping)
 * - Choose window retention based on data volume
 *
 * **UDF Development**:
 * - Package UDFs in separate JAR (easier deployment)
 * - Use @SchemaProvider for complex types
 * - Test UDFs with unit tests before deployment
 * - Avoid heavy computation in UDFs (use preprocessing)
 *
 * **Query Optimization**:
 * - Filter early in the query (before joins/aggregations)
 * - Use EMIT CHANGES for continuous queries
 * - Use EMIT FINAL for window close events only
 * - Monitor query performance with EXPLAIN
 *
 * **State Management**:
 * - Monitor state store size (du -sh /var/lib/kafka-streams/)
 * - Use changelog compaction for key-value state
 * - Consider state store TTL for large windows
 * - Backup state stores for disaster recovery
 */

export default {
  KsqlDBQueryBuilder,
  KsqlDBUDFGenerator,
  JoinPattern,
  AggregationPattern,
};
