import { JobConfig, ColumnInfo } from "../../../types";

export const generateConfig = (
    source: JobConfig,
    sink: JobConfig,
    sourceColumns: ColumnInfo[],
    sinkColumns: ColumnInfo[]
): string => {
    // 1. Generate Source Query
    // Select specific columns instead of *
    const sourceTable = source.table;
    const sourceColsStr = sourceColumns.length > 0
        ? sourceColumns.map(c => `\`${c.name}\``).join(', ')
        : '*';

    // Construct SELECT query
    // Example: query = "select id, name from table_source"
    const sourceQuery = `select ${sourceColsStr} from ${sourceTable}`;

    // 2. Generate Sink Query (Optional/Custom param)
    // Seatunnel JDBC Sink supports `query` for INSERT
    // Example: query = "INSERT INTO table_sink (id, name) VALUES (?, ?)"
    // We need to use Sink columns for INSERT format
    const sinkColsNames = sinkColumns.map(c => `\`${c.name}\``).join(', ');
    const sinkPlaceholders = sinkColumns.map(() => '?').join(', ');
    const sinkQuery = `INSERT INTO \`${sink.database}\`.\`${sink.table}\` (${sinkColsNames}) VALUES (${sinkPlaceholders})`;

    // 3. Build Configuration String
    return `env {
  execution.parallelism = 1
  job.mode = "BATCH"
}

source {
  Jdbc {
    url = "jdbc:mysql://${source.host}:${source.port}/${source.database}"
    driver = "com.mysql.cj.jdbc.Driver"
    user = "${source.user}"
    password = "${source.password || ''}"
    query = "${sourceQuery}"
  }
}

sink {
  ${sink.type === 'doris' ? 'Doris' : 'Jdbc'} {
    ${sink.type === 'doris'
            ? `fenodes = "${sink.host}:${sink.port}"
    username = "${sink.user}"
    password = "${sink.password || ''}"
    table.identifier = "${sink.database}.${sink.table}"
    sink.enable-2pc = "true"
    sink.label-prefix = "label_seatunnel"`
            : `url = "jdbc:mysql://${sink.host}:${sink.port}/${sink.database}"
    driver = "com.mysql.cj.jdbc.Driver"
    user = "${sink.user}"
    password = "${sink.password || ''}"
    query = "${sinkQuery}"`
        }
  }
}`;
};
