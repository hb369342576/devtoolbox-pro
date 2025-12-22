// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

use std::time::Duration;
use sysinfo::System;
use std::sync::Mutex;
use tauri::State;
use mysql::prelude::*;

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
    #[serde(rename = "defaultDatabase")]
    default_database: Option<String>,
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



// 表信息结构
#[derive(Debug, Serialize)]
struct TableInfo {
    name: String,
    rows: i64,
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
    #[serde(rename = "isPrimaryKey")]
    is_primary_key: bool,
    #[serde(rename = "defaultValue")]
    default_value: Option<String>,
    comment: Option<String>,
}

#[derive(Debug, Serialize)]
struct TableDetail {
    name: String,
    rows: i64,
    size: String,
    engine: Option<String>,
    collation: Option<String>,
    comment: Option<String>,
    columns: Vec<ColumnInfo>,
    ddl: String,
}

// 全局状态 (用于系统监控)
struct AppState {
    sys: Mutex<System>,
}

// --- 1. 数据库相关命令 ---

// 测试数据库连接 (真实的数据库认证)
#[tauri::command]
async fn db_test_connection(payload: DbConfig) -> Result<String, String> {
    // 构造连接字符串
    let conn_str = format!(
        "mysql://{}:{}@{}:{}",
        payload.user,
        payload.password.unwrap_or_default(),
        payload.host,
        payload.port
    );
    
    // 尝试真实的数据库连接
    match mysql::Conn::new(conn_str.as_str()) {
        Ok(mut conn) => {
            // 执行简单查询验证连接
            match conn.query_drop("SELECT 1") {
                Ok(_) => Ok("Connection successful".to_string()),
                Err(e) => Err(format!("Connection established but query failed: {}", e)),
            }
        },
        Err(e) => {
            // 连接失败，返回详细错误
            Err(format!("Failed to connect to {}@{}:{} - {}", 
                payload.user, payload.host, payload.port, e))
        },
    }
}

// 获取数据库列表 (真实查询)
#[tauri::command]
async fn db_get_databases(id: String) -> Result<Vec<String>, String> {
    // 这里应该从全局状态或配置中获取连接信息
    // 暂时使用传入的 id 作为连接字符串（格式：mysql://user:pass@host:port）
    // 实际应用中，应该维护一个连接池或配置映射
    
    let parts: Vec<&str> = id.split("://").collect();
    if parts.len() != 2 {
        return Err("Invalid connection ID format".to_string());
    }
    
    let conn_str = format!("mysql://{}", parts[1]);
    
    match mysql::Conn::new(conn_str.as_str()) {
        Ok(mut conn) => {
            match conn.query_map("SHOW DATABASES", |db_name: String| db_name) {
                Ok(databases) => Ok(databases),
                Err(e) => Err(format!("Failed to fetch databases: {}", e)),
            }
        },
        Err(e) => Err(format!("Failed to connect: {}", e)),
    }
}

// 获取表列表 (真实查询)
#[tauri::command]
async fn db_get_tables(id: String, db: String) -> Result<Vec<TableInfo>, String> {
    let parts: Vec<&str> = id.split("://").collect();
    if parts.len() != 2 {
        return Err("Invalid connection ID format".to_string());
    }
    
    let conn_str = format!("mysql://{}/{}", parts[1], db);
    
    match mysql::Conn::new(conn_str.as_str()) {
        Ok(mut conn) => {
            let query = "SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'";
            
            match conn.query_map(query, |(name, rows, size_bytes, comment): (String, Option<u64>, Option<u64>, Option<String>)| {
                TableInfo {
                    name,
                    rows: rows.unwrap_or(0) as i64,
                    size: format_size(size_bytes.unwrap_or(0)),
                    comment,
                }
            }) {
                Ok(tables) => Ok(tables),
                Err(e) => Err(format!("Failed to fetch tables: {}", e)),
            }
        },
        Err(e) => Err(format!("Failed to connect: {}", e)),
    }
}

// 获取表结构 (真实查询)
#[tauri::command]
async fn db_get_table_schema(id: String, db: String, table: String) -> Result<TableDetail, String> {
    let parts: Vec<&str> = id.split("://").collect();
    if parts.len() != 2 {
        return Err("Invalid connection ID format".to_string());
    }
    
    let conn_str = format!("mysql://{}/{}", parts[1], db);
    
    match mysql::Conn::new(conn_str.as_str()) {
        Ok(mut conn) => {
            // 获取列信息
            let column_query = format!(
                "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_SCALE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, COLUMN_COMMENT \
                FROM information_schema.COLUMNS \
                WHERE TABLE_SCHEMA = '{}' AND TABLE_NAME = '{}' \
                ORDER BY ORDINAL_POSITION",
                db, table
            );
            
            let columns: Vec<ColumnInfo> = conn.query_map(&column_query, |(name, col_type, length, scale, nullable, key, default_val, comment): (String, String, Option<u64>, Option<u32>, String, String, Option<String>, Option<String>)| {
                ColumnInfo {
                    name,
                    col_type,
                    length: length.map(|l| l as u32),
                    scale,
                    nullable: nullable == "YES",
                    is_primary_key: key == "PRI",
                    default_value: default_val,
                    comment,
                }
            }).map_err(|e| format!("Failed to fetch columns: {}", e))?;
            
            // 获取表信息
            let table_query = format!(
                "SELECT TABLE_ROWS, DATA_LENGTH, ENGINE, TABLE_COLLATION, TABLE_COMMENT \
                FROM information_schema.TABLES \
                WHERE TABLE_SCHEMA = '{}' AND TABLE_NAME = '{}'",
                db, table
            );
            
            let table_info: Option<(Option<u64>, Option<u64>, Option<String>, Option<String>, Option<String>)> = 
                conn.query_first(&table_query).map_err(|e| format!("Failed to fetch table info: {}", e))?;
            
            let (rows, size_bytes, engine, collation, comment) = table_info.unwrap_or((None, None, None, None, None));
            
            // 获取建表语句
            let ddl_query = format!("SHOW CREATE TABLE `{}`.`{}`", db, table);
            println!("Executing DDL Query: {}", ddl_query);
            let ddl: Option<(String, String)> = conn.query_first(&ddl_query).map_err(|e| format!("Failed to fetch DDL (Query: {}): {}", ddl_query, e))?;
            let ddl_statement = ddl.map(|(_, create_sql)| create_sql).unwrap_or_default();
            
            Ok(TableDetail {
                name: table,
                rows: rows.unwrap_or(0) as i64,
                size: format_size(size_bytes.unwrap_or(0)),
                engine,
                collation,
                comment,
                columns,
                ddl: ddl_statement,
            })
        },
        Err(e) => Err(format!("Failed to connect: {}", e)),
    }
}

// 辅助函数：格式化字节大小
fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    
    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
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
        os: System::name().unwrap_or_else(|| "Unknown".to_string()),
        kernel: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        cpu: sys.cpus().first().map(|cpu| cpu.brand().to_string()).unwrap_or_else(|| "Unknown".to_string()),
        memory: format!("{:.2} GB", sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0),
        uptime: format!("{} s", System::uptime()),
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