// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::net::TcpStream;
use std::time::Duration;
use sysinfo::{CpuExt, System, SystemExt};
use std::sync::Mutex;
use tauri::State;

// --- 结构体定义 ---

// 数据库连接配置
#[derive(Debug, Serialize, Deserialize)]
struct DbConfig {
    id: Option<String>,
    #[serde(rename = "type")]
    db_type: String, // 'type' 是 Rust 关键字，所以重命名
    host: String,
    port: String,
    user: String,
    password: Option<String>,
    database: Option<String>,
    defaultDatabase: Option<String>,
}

// Seatunnel 任务配置
#[derive(Debug, Serialize, Deserialize)]
struct JobConfig {
    #[serde(rename = "type")]
    job_type: String,
    host: String,
    port: String,
    user: String,
    password: Option<String>,
    database: String,
    table: String,
}

// 系统信息
#[derive(Debug, Serialize)]
struct SystemInfo {
    os: String,
    kernel: String,
    hostname: String,
    cpu: String,
    memory: String,
    uptime: String,
}

// 系统统计
#[derive(Debug, Serialize)]
struct SystemStats {
    cpu: f32,
    mem: u64, // percentage
}

// Excel SQL 生成请求
#[derive(Debug, Deserialize)]
struct ExcelSqlRequest {
    sheetName: String,
    dbType: String,
}

// PDF 处理请求
#[derive(Debug, Deserialize)]
struct PdfRequest {
    mode: String,
    files: Vec<String>,
    meta: Option<serde_json::Value>,
}

// 表信息结构
#[derive(Debug, Serialize)]
struct TableInfo {
    name: String,
    rows: u64,
    size: String,
    comment: Option<String>,
}

// 表详情结构 (Schema)
#[derive(Debug, Serialize)]
struct ColumnInfo {
    name: String,
    #[serde(rename = "type")]
    col_type: String,
    length: Option<u32>,
    scale: Option<u32>,
    nullable: bool,
    isPrimaryKey: bool,
    defaultValue: Option<String>,
    comment: Option<String>,
}

#[derive(Debug, Serialize)]
struct TableDetail {
    name: String,
    rows: u64,
    size: String,
    engine: Option<String>,
    collation: Option<String>,
    comment: Option<String>,
    columns: Vec<ColumnInfo>,
}

// 全局状态 (用于系统监控)
struct AppState {
    sys: Mutex<System>,
}

// --- 1. 数据库相关命令 ---

// 测试数据库连接 (真实的 TCP 探测)
#[tauri::command]
async fn db_test_connection(payload: DbConfig) -> bool {
    // 简单实现：尝试建立 TCP 连接
    // 在生产环境中，应该使用 sqlx 或对应数据库驱动进行真实认证
    let address = format!("{}:{}", payload.host, payload.port);
    match TcpStream::connect_timeout(&address.parse().unwrap_or("127.0.0.1:0".parse().unwrap()), Duration::from_secs(2)) {
        Ok(_) => true,
        Err(_) => false,
    }
}

// 获取数据库列表 (Mocked for Demo, but ready for implementation)
#[tauri::command]
async fn db_get_databases(_id: String) -> Vec<String> {
    // 实际应根据 ID 查找连接并查询
    // 这里返回模拟的真实感数据
    vec![
        "information_schema".to_string(),
        "mysql".to_string(),
        "performance_schema".to_string(),
        "sys".to_string(),
        "app_db".to_string(),
        "logs_db".to_string()
    ]
}

// 获取表列表
#[tauri::command]
async fn db_get_tables(_id: String, db: String) -> Vec<TableInfo> {
    // 模拟数据
    let mut tables = Vec::new();
    if db == "app_db" {
        tables.push(TableInfo { name: "users".to_string(), rows: 100, size: "16KB".to_string(), comment: Some("Users table".to_string()) });
        tables.push(TableInfo { name: "orders".to_string(), rows: 5000, size: "2MB".to_string(), comment: Some("Orders table".to_string()) });
    } else {
        tables.push(TableInfo { name: "sys_config".to_string(), rows: 10, size: "4KB".to_string(), comment: None });
    }
    tables
}

// 获取表结构
#[tauri::command]
async fn db_get_table_schema(_id: String, _db: String, table: String) -> Option<TableDetail> {
    // 模拟根据表名返回不同的结构
    let mut columns = Vec::new();
    
    // ID Column (Common)
    columns.push(ColumnInfo {
        name: "id".to_string(),
        col_type: "bigint".to_string(),
        length: Some(20),
        scale: None,
        nullable: false,
        isPrimaryKey: true,
        defaultValue: None,
        comment: Some("Primary Key".to_string()),
    });

    if table == "users" {
        columns.push(ColumnInfo { name: "username".to_string(), col_type: "varchar".to_string(), length: Some(50), scale: None, nullable: false, isPrimaryKey: false, defaultValue: None, comment: None });
        columns.push(ColumnInfo { name: "email".to_string(), col_type: "varchar".to_string(), length: Some(100), scale: None, nullable: true, isPrimaryKey: false, defaultValue: None, comment: None });
    } else if table == "orders" {
        columns.push(ColumnInfo { name: "order_no".to_string(), col_type: "varchar".to_string(), length: Some(32), scale: None, nullable: false, isPrimaryKey: false, defaultValue: None, comment: None });
        columns.push(ColumnInfo { name: "amount".to_string(), col_type: "decimal".to_string(), length: Some(10), scale: Some(2), nullable: false, isPrimaryKey: false, defaultValue: Some("0.00".to_string()), comment: None });
    }

    columns.push(ColumnInfo { name: "created_at".to_string(), col_type: "datetime".to_string(), length: None, scale: None, nullable: false, isPrimaryKey: false, defaultValue: Some("CURRENT_TIMESTAMP".to_string()), comment: None });

    Some(TableDetail {
        name: table,
        rows: 100,
        size: "16KB".to_string(),
        engine: Some("InnoDB".to_string()),
        collation: Some("utf8mb4_general_ci".to_string()),
        comment: Some("Table Description".to_string()),
        columns
    })
}

// --- 2. Excel 相关命令 ---

#[tauri::command]
fn parse_excel_sheets(file_name: String) -> Vec<String> {
    // 在真实应用中，这里使用 calamine 库读取 Excel
    // 这里简单返回模拟结果
    println!("Parsing Excel: {}", file_name);
    vec!["Sheet1".to_string(), "Data_Export".to_string(), "Config".to_string()]
}

#[tauri::command]
fn generate_excel_sql(sheet_name: String, db_type: String) -> String {
    let table_name = sheet_name.to_lowercase().replace(" ", "_");
    // 模拟生成的 SQL
    format!(
        "-- Generated SQL for Sheet: {}\n-- Target DB: {}\n\nCREATE TABLE `{}` (\n  `id` BIGINT NOT NULL AUTO_INCREMENT,\n  `col_a` VARCHAR(255),\n  `col_b` INT,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB;",
        sheet_name, db_type, table_name
    )
}

// --- 3. Seatunnel 相关命令 ---

#[tauri::command]
fn generate_seatunnel_config(source: JobConfig, sink: JobConfig) -> String {
    // 简单的模板替换
    let source_url = format!("jdbc:mysql://{}:{}/{}", source.host, source.port, source.database);
    let sink_url = if sink.job_type == "doris" {
        format!("{}:{}", sink.host, sink.port) // Doris FE nodes
    } else {
        format!("jdbc:mysql://{}:{}/{}", sink.host, sink.port, sink.database)
    };

    format!(r#"env {{
  execution.parallelism = 1
  job.mode = "BATCH"
}}

source {{
  Jdbc {{
    url = "{}"
    driver = "com.mysql.cj.jdbc.Driver"
    user = "{}"
    password = "{}"
    query = "select * from {}"
  }}
}}

sink {{
  {} {{
    {}
  }}
}}"#, 
    source_url, source.user, source.password.unwrap_or_default(), source.table,
    if sink.job_type == "doris" { "Doris" } else { "Jdbc" },
    if sink.job_type == "doris" {
        format!(r#"fenodes = "{}"
    username = "{}"
    password = "{}"
    table.identifier = "{}.{}"
    sink.enable-2pc = "true"
    sink.label-prefix = "label_seatunnel""#, sink_url, sink.user, sink.password.unwrap_or_default(), sink.database, sink.table)
    } else {
        format!(r#"url = "{}"
    driver = "com.mysql.cj.jdbc.Driver"
    user = "{}"
    password = "{}"
    table = "{}.{}""#, sink_url, sink.user, sink.password.unwrap_or_default(), sink.database, sink.table)
    }
    )
}

// --- 4. 系统监控相关命令 ---

#[tauri::command]
fn get_system_info(state: State<AppState>) -> SystemInfo {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_all();

    SystemInfo {
        os: sys.name().unwrap_or_else(|| "Unknown".to_string()),
        kernel: sys.kernel_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: sys.host_name().unwrap_or_else(|| "Unknown".to_string()),
        cpu: sys.cpus()[0].brand().to_string(),
        memory: format!("{:.2} GB", sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0),
        uptime: format!("{} s", sys.uptime()),
    }
}

#[tauri::command]
fn get_system_stats(state: State<AppState>) -> SystemStats {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_cpu();
    sys.refresh_memory();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let mem_used = sys.used_memory();
    let mem_total = sys.total_memory();
    let mem_usage = (mem_used as f64 / mem_total as f64 * 100.0) as u64;

    SystemStats {
        cpu: cpu_usage,
        mem: mem_usage,
    }
}

// --- 5. PDF 相关命令 ---

#[tauri::command]
async fn process_pdf(mode: String, files: Vec<String>, meta: Option<serde_json::Value>) -> Result<String, String> {
    // 真实场景使用 lopdf 或 pdf-cpu 库
    println!("Processing PDF: Mode={}, Files={:?}, Meta={:?}", mode, files, meta);
    // 模拟处理耗时
    std::thread::sleep(Duration::from_millis(1000));
    Ok("Success".to_string())
}

fn main() {
    let state = AppState {
        sys: Mutex::new(System::new_all()),
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            db_test_connection,
            db_get_databases,
            db_get_tables,
            db_get_table_schema,
            parse_excel_sheets,
            generate_excel_sql,
            generate_seatunnel_config,
            get_system_info,
            get_system_stats,
            process_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}