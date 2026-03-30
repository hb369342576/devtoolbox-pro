# 数据服务 API 文档

## 概述

数据服务提供动态数据源管理和REST API映射功能，支持将数据库表/SQL映射为REST API。

### 基础信息

| 项目 | 说明 |
|------|------|
| 基础URL | http://localhost:18087 |
| Content-Type | application/json |
| 字符编码 | UTF-8 |

### 认证方式

#### 方式一：JWT Bearer Token（推荐）

请求头：
```
Authorization: Bearer <token>
```

#### 方式二：签名认证

请求头：
```
X-App-Id: <appId>
X-Timestamp: <毫秒时间戳>
X-Signature: MD5(appId + timestamp + secretKey)
```

### API状态说明

| 状态码 | 说明 | 可否访问 |
|--------|------|----------|
| 0 | 草稿 | 否 |
| 1 | 已发布 | 是 |
| 2 | 已下线 | 否 |

### 通用响应格式

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

### 错误码说明

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 认证失败 |
| 403 | 无权限 |
| 500 | 服务器内部错误 |

---

## 一、数据源管理

### 1.1 新增数据源

**请求**
```
POST /dataservice/manage/datasource/add
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| datasourceName | String | 是 | 数据源名称 | MySQL测试库 |
| datasourceType | String | 是 | 数据源类型 | mysql |
| host | String | 是 | 主机地址 | localhost |
| port | Integer | 是 | 端口号 | 3306 |
| databaseName | String | 是 | 数据库名 | test_db |
| username | String | 是 | 用户名 | root |
| password | String | 是 | 密码 | 123456 |
| extraParams | String | 否 | 额外连接参数 | useSSL=false |
| status | Integer | 否 | 状态(0禁用,1启用) | 1 |
| remark | String | 否 | 备注 | 测试环境 |

**请求示例**
```json
{
  "datasourceName": "MySQL测试库",
  "datasourceType": "mysql",
  "host": "192.168.1.100",
  "port": 3306,
  "databaseName": "test_db",
  "username": "root",
  "password": "123456",
  "extraParams": "useSSL=false&serverTimezone=GMT%2B8",
  "status": 1,
  "remark": "测试环境MySQL"
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": 2037470682316664833
}
```

---

### 1.2 修改数据源

**请求**
```
POST /dataservice/manage/datasource/update
```

**请求参数**：同新增，必须包含 `id` 字段

**请求示例**
```json
{
  "id": 2037470682316664833,
  "datasourceName": "MySQL测试库(已更新)",
  "host": "192.168.1.101",
  "port": 3306,
  "databaseName": "test_db_v2",
  "username": "root",
  "password": "new_password"
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

### 1.3 删除数据源

**请求**
```
POST /dataservice/manage/datasource/delete
```

**请求示例**
```json
[2037470682316664833, 2037470682316664834]
```

**成功响应**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

**失败响应（存在关联API）**
```json
{
  "code": 500,
  "msg": "数据源【MySQL测试库】存在 3 个关联API，请先删除关联API"
}
```

**注意：** 删除数据源前必须先删除所有关联的API

---

### 1.4 查询数据源详情

**请求**
```
GET /dataservice/manage/datasource/get/{id}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 2037470682316664833,
    "datasourceName": "MySQL测试库",
    "datasourceType": "mysql",
    "host": "192.168.1.100",
    "port": 3306,
    "databaseName": "test_db",
    "username": "root",
    "extraParams": "useSSL=false",
    "status": 1,
    "remark": "测试环境",
    "createTime": "2026-03-30T10:00:00",
    "updateTime": "2026-03-30T10:00:00",
    "apiCount": 3,
    "apiList": [
      {
        "id": 2037470682316664834,
        "apiName": "船舶状态报告查询",
        "apiDesc": "查询船舶CII状态报告数据",
        "queryType": "table",
        "tableName": "ods_cii_ship_status_report_d",
        "status": 1,
        "createTime": "2026-03-30T10:00:00"
      }
    ]
  }
}
```

---

### 1.5 分页查询数据源列表

**请求**
```
POST /dataservice/manage/datasource/page
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| pageNum | Integer | 否 | 页码 | 1 |
| pageSize | Integer | 否 | 每页数量 | 10 |
| datasourceName | String | 否 | 数据源名称(模糊查询) | - |
| datasourceType | String | 否 | 数据源类型 | - |
| status | Integer | 否 | 状态 | - |

**请求示例**
```json
{
  "pageNum": 1,
  "pageSize": 10,
  "datasourceName": "",
  "datasourceType": "mysql",
  "status": 1
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "total": 100,
    "rows": [
      {
        "id": 2037470682316664833,
        "datasourceName": "MySQL测试库",
        "datasourceType": "mysql",
        "host": "192.168.1.100",
        "port": 3306,
        "databaseName": "test_db",
        "username": "root",
        "status": 1,
        "createTime": "2026-03-30T10:00:00"
      }
    ]
  }
}
```

---

### 1.6 测试数据源连接

**请求**
```
POST /dataservice/manage/datasource/test/{id}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": true
}
```

---

### 1.7 测试数据源连接(不保存)

**请求**
```
POST /dataservice/manage/datasource/test
```

**请求参数**：同新增数据源

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": true
}
```

---

### 1.8 获取数据源下的表列表

**请求**
```
GET /dataservice/manage/datasource/tables/{datasourceId}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    "sys_user",
    "sys_role",
    "sys_menu",
    "ods_cii_ship_status_report_d"
  ]
}
```

---

### 1.9 获取表的字段列表

**请求**
```
GET /dataservice/manage/datasource/columns/{datasourceId}?tableName=table_name
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "fieldName": "id",
      "fieldType": "BIGINT",
      "fieldDesc": "主键ID",
      "isRequired": 1,
      "isFilter": 1
    },
    {
      "fieldName": "username",
      "fieldType": "VARCHAR",
      "fieldDesc": "用户名",
      "isRequired": 1,
      "isFilter": 1
    },
    {
      "fieldName": "create_time",
      "fieldType": "DATETIME",
      "fieldDesc": "创建时间",
      "isRequired": 0,
      "isFilter": 0
    }
  ]
}
```

---

### 1.10 预览表数据

**请求**
```
GET /dataservice/manage/datasource/preview/{datasourceId}?tableName=table_name&limit=10
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "create_time": "2026-01-01T00:00:00"
    },
    {
      "id": 2,
      "username": "user1",
      "email": "user1@example.com",
      "create_time": "2026-01-02T00:00:00"
    }
  ]
}
```

---

### 1.11 解析SQL获取字段

**请求**
```
POST /dataservice/manage/datasource/parseSql
```

**请求示例**
```json
{
  "sql": "SELECT id, username, email FROM sys_user WHERE status = 1"
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "fieldName": "id",
      "fieldType": "BIGINT"
    },
    {
      "fieldName": "username",
      "fieldType": "VARCHAR"
    },
    {
      "fieldName": "email",
      "fieldType": "VARCHAR"
    }
  ]
}
```

---

### 支持的数据源类型

| 类型 | 代码 | 默认端口 | JDBC URL格式 |
|------|------|----------|--------------|
| MySQL | mysql | 3306 | jdbc:mysql://{host}:{port}/{database} |
| Apache Doris | doris | 9030 | jdbc:mysql://{host}:{port}/{database} |
| PostgreSQL | postgresql | 5432 | jdbc:postgresql://{host}:{port}/{database} |
| Oracle | oracle | 1521 | jdbc:oracle:thin:@{host}:{port}:{database} |
| SQL Server | sqlserver | 1433 | jdbc:sqlserver://{host}:{port};DatabaseName={database} |
| ClickHouse | clickhouse | 8123 | jdbc:clickhouse://{host}:{port}/{database} |
| Apache Hive | hive | 10000 | jdbc:hive2://{host}:{port}/{database} |
| Presto | presto | 8080 | jdbc:presto://{host}:{port}/{database} |
| Trino | trino | 8080 | jdbc:trino://{host}:{port}/{database} |
| 达梦数据库 | dm | 5236 | jdbc:dm://{host}:{port}/{database} |
| 人大金仓 | kingbase | 54321 | jdbc:kingbase8://{host}:{port}/{database} |
| 华为GaussDB | gaussdb | 5432 | jdbc:opengauss://{host}:{port}/{database} |

---

## 二、API管理

### 2.1 新增API

**请求**
```
POST /dataservice/manage/api/add
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| apiName | String | 是 | API名称 | 用户列表查询 |
| apiDesc | String | 否 | API描述 | 查询系统用户列表 |
| datasourceId | Long | 是 | 数据源ID | 1 |
| queryType | String | 是 | 查询类型(table/sql) | table |
| tableName | String | 条件 | 表名(queryType=table必填) | sys_user |
| sqlContent | String | 条件 | SQL内容(queryType=sql必填) | SELECT * FROM users |
| defaultRateLimit | Integer | 否 | 默认限流(次/分钟) | 100 |
| defaultTimeout | Integer | 否 | 默认超时(秒) | 30 |
| fields | Array | 否 | 字段配置列表 | - |

**字段配置参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| fieldName | String | 是 | 字段名 | user_id |
| fieldAlias | String | 否 | 字段别名 | userId |
| fieldType | String | 否 | 字段类型 | Long |
| fieldDesc | String | 否 | 字段描述 | 用户ID |
| isRequired | Integer | 否 | 是否必填(0否,1是) | 0 |
| isFilter | Integer | 否 | 是否可过滤(0否,1是) | 1 |
| isSort | Integer | 否 | 是否可排序(0否,1是) | 1 |
| defaultValue | String | 否 | 默认值 | - |

**请求示例 - 表模式**
```json
{
  "apiName": "船舶状态报告查询",
  "apiDesc": "查询船舶CII状态报告数据",
  "datasourceId": 2037470682316664833,
  "queryType": "table",
  "tableName": "ods_cii_ship_status_report_d",
  "defaultRateLimit": 100,
  "defaultTimeout": 30,
  "fields": [
    {
      "fieldName": "ship_code",
      "fieldAlias": "shipCode",
      "fieldType": "String",
      "fieldDesc": "船舶代码",
      "isFilter": 1,
      "isSort": 1
    },
    {
      "fieldName": "report_date",
      "fieldAlias": "reportDate",
      "fieldType": "Date",
      "fieldDesc": "报告日期",
      "isFilter": 1,
      "isSort": 1
    },
    {
      "fieldName": "voyage_no",
      "fieldAlias": "voyageNo",
      "fieldType": "String",
      "fieldDesc": "航次号"
    },
    {
      "fieldName": "cii_rating",
      "fieldAlias": "ciiRating",
      "fieldType": "String",
      "fieldDesc": "CII等级",
      "isFilter": 1
    }
  ]
}
```

**请求示例 - SQL模式**
```json
{
  "apiName": "用户订单统计",
  "apiDesc": "按用户统计订单数量和金额",
  "datasourceId": 2037470682316664833,
  "queryType": "sql",
  "sqlContent": "SELECT user_id, COUNT(*) as order_count, SUM(amount) as total_amount FROM orders WHERE create_date >= '${startDate}' AND create_date <= '${endDate}' GROUP BY user_id",
  "fields": [
    {
      "fieldName": "user_id",
      "fieldAlias": "userId",
      "fieldDesc": "用户ID"
    },
    {
      "fieldName": "order_count",
      "fieldAlias": "orderCount",
      "fieldDesc": "订单数量"
    },
    {
      "fieldName": "total_amount",
      "fieldAlias": "totalAmount",
      "fieldDesc": "总金额"
    }
  ]
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": 2037470682316664834
}
```

---

### 2.2 修改API

**请求**
```
POST /dataservice/manage/api/update
```

**注意：** 已发布的API需要先下线才能修改

**请求参数**：同新增，必须包含 `id` 字段

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

### 2.3 删除API

**请求**
```
POST /dataservice/manage/api/delete
```

**请求示例**
```json
[2037470682316664834, 2037470682316664835]
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

### 2.4 查询API详情

**请求**
```
GET /dataservice/manage/api/get/{id}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 2037470682316664834,
    "apiName": "船舶状态报告查询",
    "apiDesc": "查询船舶CII状态报告数据",
    "queryType": "table",
    "datasourceId": 2037470682316664833,
    "datasourceName": "Doris测试库",
    "tableName": "ods_cii_ship_status_report_d",
    "defaultRateLimit": 100,
    "defaultTimeout": 30,
    "status": 1,
    "createTime": "2026-03-30T10:00:00",
    "updateTime": "2026-03-30T10:00:00",
    "fields": [
      {
        "id": 1,
        "apiId": 2037470682316664834,
        "fieldName": "ship_code",
        "fieldAlias": "shipCode",
        "fieldType": "String",
        "fieldDesc": "船舶代码",
        "isFilter": 1,
        "isSort": 1
      }
    ]
  }
}
```

---

### 2.5 分页查询API列表

**请求**
```
POST /dataservice/manage/api/page
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| pageNum | Integer | 否 | 页码 |
| pageSize | Integer | 否 | 每页数量 |
| apiName | String | 否 | API名称(模糊查询) |
| queryType | String | 否 | 查询类型 |
| status | Integer | 否 | 状态 |

**请求示例**
```json
{
  "pageNum": 1,
  "pageSize": 10,
  "apiName": "船舶",
  "status": 1
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "total": 50,
    "rows": [
      {
        "id": 2037470682316664834,
        "apiName": "船舶状态报告查询",
        "apiDesc": "查询船舶CII状态报告数据",
        "queryType": "table",
        "datasourceId": 2037470682316664833,
        "datasourceName": "Doris测试库",
        "tableName": "ods_cii_ship_status_report_d",
        "status": 1,
        "createTime": "2026-03-30T10:00:00"
      }
    ]
  }
}
```

---

### 2.6 发布API

**请求**
```
POST /dataservice/manage/api/publish/{id}
```

**注意：** 只有发布的API才能被访问

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

### 2.7 下线API

**请求**
```
POST /dataservice/manage/api/offline/{id}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

## 三、用户管理

### 3.1 新增用户

**请求**
```
POST /dataservice/manage/user/add
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| userName | String | 是 | 用户名称 | 测试应用 |
| email | String | 否 | 邮箱 | test@example.com |
| phone | String | 否 | 手机号 | 13800138000 |
| status | Integer | 否 | 状态(0禁用,1启用) | 1 |
| remark | String | 否 | 备注 | 用于XX系统对接 |

**请求示例**
```json
{
  "userName": "测试应用",
  "email": "test@example.com",
  "phone": "13800138000",
  "status": 1,
  "remark": "用于XX系统对接"
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": 2037470682316664835
}
```

**说明：** 系统自动生成 `appId` 和 `secretKey`，请妥善保管

---

### 3.2 查询用户详情

**请求**
```
GET /dataservice/manage/user/get/{id}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 2037470682316664835,
    "userName": "测试应用",
    "appId": "66b7d3b5324b7fb7",
    "secretKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "email": "test@example.com",
    "phone": "13800138000",
    "status": 1,
    "remark": "用于XX系统对接",
    "createTime": "2026-03-30T10:00:00"
  }
}
```

---

### 3.3 重置密钥

**请求**
```
POST /dataservice/manage/user/resetSecretKey/{id}
```

**注意：** 重置后旧的Token将失效

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

### 3.4 启用/禁用用户

**请求**
```
POST /dataservice/manage/user/status?id={id}&status={status}
```

**参数说明**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | Long | 用户ID |
| status | Integer | 状态(0禁用,1启用) |

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

## 四、权限管理

### 4.1 新增权限（授权API给用户）

**请求**
```
POST /dataservice/manage/permission/add
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| userId | Long | 是 | 用户ID | 1 |
| apiId | Long | 是 | API ID | 1 |
| permissionType | Integer | 否 | 权限类型(1只读) | 1 |
| rateLimit | Integer | 否 | 限流(次/分钟) | 100 |
| dailyLimit | Integer | 否 | 每日限额 | 10000 |
| expireTime | String | 否 | 过期时间 | 2026-12-31T23:59:59 |
| fieldPermissions | Array | 否 | 字段权限列表 | 见下方示例 |

**字段权限参数说明**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| fieldId | Long | 是 | 字段ID | 1 |
| fieldPermission | Integer | 是 | 字段权限(1-可见,2-脱敏,3-隐藏) | 1 |
| contentFilterType | Integer | 否 | 内容过滤类型(1-白名单,2-黑名单) | 1 |
| contentFilterValues | String | 否 | 过滤值，多个用逗号分隔 | "A,B,C" |

**字段权限类型说明**

| 值 | 权限类型 | 说明 |
|----|---------|------|
| 1 | 可见 | 字段正常显示 |
| 2 | 脱敏 | 字段内容脱敏显示（如：138****8888） |
| 3 | 隐藏 | 该字段不返回 |

**内容过滤说明**

| 值 | 过滤类型 | 说明 |
|----|---------|------|
| 1 | 白名单 | 只显示指定值的数据（IN查询） |
| 2 | 黑名单 | 排除指定值的数据（NOT IN查询） |

**完整示例 - 基础授权（所有字段可见）**

```json
{
  "userId": 2037470682316664835,
  "apiId": 2037470682316664834,
  "permissionType": 1,
  "rateLimit": 100,
  "dailyLimit": 10000,
  "expireTime": "2026-12-31T23:59:59"
}
```

**完整示例 - 授权并设置字段权限**

```json
{
  "userId": 2037470682316664835,
  "apiId": 2037470682316664834,
  "permissionType": 1,
  "rateLimit": 100,
  "dailyLimit": 1000,
  "expireTime": "2026-12-31T23:59:59",
  "fieldPermissions": [
    {
      "fieldId": 1,
      "fieldPermission": 1,
      "contentFilterType": 1,
      "contentFilterValues": "RuiNing6,RuiNing7"
    },
    {
      "fieldId": 2,
      "fieldPermission": 1
    },
    {
      "fieldId": 3,
      "fieldPermission": 2
    },
    {
      "fieldId": 4,
      "fieldPermission": 3
    }
  ]
}
```

**场景说明：**
- 字段1（ship_code）：可见，但只显示"RuiNing6"和"RuiNing7"两艘船的数据（白名单）
- 字段2（report_date）：正常可见
- 字段3（phone）：脱敏显示（如138****8888）
- 字段4（internal_id）：隐藏，不返回

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": 2037470682316664836
}
```

**重要说明：**
- 当前版本只支持**只读权限**（permissionType固定为1）
- 如果不设置fieldPermissions，用户可以看到API的所有字段
- 只设置部分字段权限时，其他字段默认为可见

---

### 4.2 修改权限

**请求**
```
POST /dataservice/manage/permission/update
```

**请求参数**：同新增，必须包含 `id` 字段

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

### 4.3 删除权限

**请求**
```
POST /dataservice/manage/permission/delete
```

**请求示例**
```json
[2037470682316664836, 2037470682316664837]
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

---

### 4.4 查询权限详情

**请求**
```
GET /dataservice/manage/permission/get/{id}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 2037470682316664836,
    "userId": 2037470682316664835,
    "apiId": 2037470682316664834,
    "permissionType": 1,
    "rateLimit": 100,
    "dailyLimit": 1000,
    "status": 1,
    "expireTime": "2026-12-31T23:59:59"
  }
}
```

---

### 4.5 查询用户权限列表

**请求**
```
GET /dataservice/manage/permission/listByUser/{userId}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "id": 2037470682316664836,
      "userId": 2037470682316664835,
      "userName": "测试应用",
      "apiId": 2037470682316664834,
      "apiName": "船舶状态报告查询",
      "permissionType": 1,
      "rateLimit": 100,
      "dailyLimit": 1000,
      "status": 1,
      "expireTime": "2026-12-31T23:59:59"
    }
  ]
}
```

---

### 4.6 查询API权限列表

**请求**
```
GET /dataservice/manage/permission/listByApi/{apiId}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "id": 2037470682316664836,
      "userId": 2037470682316664835,
      "userName": "测试应用",
      "apiId": 2037470682316664834,
      "apiName": "船舶状态报告查询",
      "permissionType": 1,
      "rateLimit": 100,
      "dailyLimit": 1000,
      "status": 1
    }
  ]
}
```

---

## 五、Token管理

### 5.1 生成JWT Token

**请求**
```
GET /dataservice/token/generate
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| appId | String | 是 | 应用ID | 66b7d3b5324b7fb7 |
| apiId | Long | 是 | API ID | 2037470682316664834 |
| expireTimestamp | Long | 否 | 过期时间戳(毫秒) | 1735689600000 |
| expireDays | Integer | 否 | 过期天数 | 30 |

**请求示例**
```
GET /dataservice/token/generate?appId=66b7d3b5324b7fb7&apiId=2037470682316664834&expireDays=30
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "appId": "66b7d3b5324b7fb7",
    "apiId": 2037470682316664834,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6IjY2YjdkM2I1MzI0YjdmYjciLCJ1c2VySWQiOjIwMzc0NzA2ODIzMTY2NjQ4MzUsImFwaUlkIjoyMDM3NDcwNjgyMzE2NjY0ODM0LCJpYXQiOjE3MTAwODMyMDAsImV4cCI6MTcxMjY3NTIwMH0.abc123...",
    "tokenType": "Bearer",
    "expireTimestamp": 1712675200000,
    "expireDays": 30,
    "curlExample": "curl -X POST 'http://localhost:18087/dataservice/query/page/2037470682316664834' -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJ...' -d '{\"pageNum\":1,\"pageSize\":10}'"
  }
}
```

**重要说明：**
- Token绑定特定API，只能访问该API
- `expireTimestamp` 和 `expireDays` 二选一，都不传则默认7天
- Token过期后需要重新生成

---

## 六、数据查询

### 认证方式

#### JWT Token方式（推荐）

**请求头**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**curl示例**
```bash
curl -X POST 'http://localhost:18087/dataservice/query/page/2037470682316664834' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -d '{"pageNum":1,"pageSize":10}'
```

#### 签名认证方式

**请求头**
```
X-App-Id: 66b7d3b5324b7fb7
X-Timestamp: 1710083200000
X-Signature: abc123def456...
```

**签名算法**
```
signature = MD5(appId + timestamp + secretKey)
```

**curl示例**
```bash
curl -X POST 'http://localhost:18087/dataservice/query/page/2037470682316664834' \
  -H 'Content-Type: application/json' \
  -H 'X-App-Id: 66b7d3b5324b7fb7' \
  -H 'X-Timestamp: 1710083200000' \
  -H 'X-Signature: abc123def456...' \
  -d '{"pageNum":1,"pageSize":10}'
```

---

### 6.1 分页查询

**请求**
```
POST /dataservice/query/page/{apiId}
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| pageNum | Integer | 否 | 页码 | 1 |
| pageSize | Integer | 否 | 每页数量 | 10 |
| params | Object | 否 | 过滤参数 | - |
| sortField | String | 否 | 排序字段 | - |
| sortOrder | String | 否 | 排序方式(asc/desc) | - |

**请求示例**
```json
{
  "pageNum": 1,
  "pageSize": 10,
  "params": {
    "ship_code": "RuiNing6",
    "cii_rating": "A"
  },
  "sortField": "report_date",
  "sortOrder": "desc"
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "total": 156,
    "rows": [
      {
        "shipCode": "RuiNing6",
        "reportDate": "2026-03-30",
        "voyageNo": "V2026001",
        "ciiRating": "A",
        "ciiValue": 4.52
      },
      {
        "shipCode": "RuiNing6",
        "reportDate": "2026-03-29",
        "voyageNo": "V2026001",
        "ciiRating": "A",
        "ciiValue": 4.48
      }
    ]
  }
}
```

**过滤参数说明**

| 操作符 | 格式 | 示例 |
|--------|------|------|
| 等于 | `"field": "value"` | `"ship_code": "RuiNing6"` |
| 模糊查询 | `"field": "%value%"` | `"ship_name": "%宁%"` |
| IN查询 | `"field": ["v1", "v2"]` | `"cii_rating": ["A", "B"]` |

---

### 6.2 列表查询（不分页）

**请求**
```
POST /dataservice/query/list/{apiId}
```

**请求示例**
```json
{
  "params": {
    "ship_code": "RuiNing6"
  },
  "sortField": "report_date",
  "sortOrder": "desc"
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "shipCode": "RuiNing6",
      "reportDate": "2026-03-30",
      "voyageNo": "V2026001",
      "ciiRating": "A"
    }
  ]
}
```

**注意：** 列表查询不限制数量，请谨慎使用避免大数据量查询

---

### 6.3 查询单条数据

**请求**
```
POST /dataservice/query/one/{apiId}
```

**请求示例**
```json
{
  "params": {
    "id": 1
  }
}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 1,
    "shipCode": "RuiNing6",
    "reportDate": "2026-03-30",
    "voyageNo": "V2026001",
    "ciiRating": "A"
  }
}
```

**说明：** 返回第一条匹配的记录，无数据返回 `null`

---

## 七、API文档

### 7.1 获取已发布的API列表

**请求**
```
GET /dataservice/doc/apis
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "apiId": 2037470682316664834,
      "apiName": "船舶状态报告查询",
      "apiDesc": "查询船舶CII状态报告数据",
      "queryType": "table",
      "datasourceId": 2037470682316664833,
      "datasourceName": "Doris测试库",
      "tableName": "ods_cii_ship_status_report_d",
      "status": 1,
      "statusDesc": "已发布",
      "createTime": "2026-03-30T10:00:00",
      "endpoints": {
        "page": "/dataservice/query/page/2037470682316664834",
        "list": "/dataservice/query/list/2037470682316664834",
        "one": "/dataservice/query/one/2037470682316664834"
      }
    }
  ]
}
```

**说明：** 用于API文档首页展示所有已发布的API列表

---

### 7.2 获取API文档详情

**请求**
```
GET /dataservice/doc/api/{id}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "apiName": "船舶状态报告查询",
    "apiPath": "/dataservice/query/page/2037470682316664834",
    "apiDesc": "查询船舶CII状态报告数据",
    "method": "POST",
    "contentType": "application/json",
    "headers": {
      "X-App-Id": "应用ID",
      "X-Timestamp": "时间戳（毫秒）",
      "X-Signature": "签名（MD5(appId + timestamp + secretKey)）"
    },
    "requestParams": [
      {
        "name": "pageNum",
        "type": "Integer",
        "desc": "页码",
        "defaultValue": 1,
        "required": false
      },
      {
        "name": "pageSize",
        "type": "Integer",
        "desc": "每页数量",
        "defaultValue": 10,
        "required": false
      },
      {
        "name": "shipCode",
        "type": "String",
        "desc": "船舶代码",
        "defaultValue": null,
        "required": false
      }
    ],
    "responseFields": [
      {
        "field": "shipCode",
        "type": "String",
        "desc": "船舶代码"
      },
      {
        "field": "reportDate",
        "type": "Date",
        "desc": "报告日期"
      }
    ],
    "example": {
      "url": "/dataservice/query/page/2037470682316664834",
      "method": "POST",
      "headers": {
        "X-App-Id": "your_app_id",
        "X-Timestamp": 1710083200000,
        "X-Signature": "your_signature"
      },
      "body": {
        "pageNum": 1,
        "pageSize": 10
      }
    }
  }
}
```

---

### 7.3 生成CURL命令

**请求**
```
GET /dataservice/doc/api/{id}/curl?appId={appId}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": "curl -X POST 'http://localhost:18087/dataservice/query/page/2037470682316664834' \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-App-Id: 66b7d3b5324b7fb7' \\\n  -H 'X-Timestamp: 1710083200000' \\\n  -H 'X-Signature: abc123...' \\\n  -d '{\"pageNum\":1,\"pageSize\":10}'"
}
```

---

## 八、签名认证

### 8.1 生成请求签名

**请求**
```
GET /dataservice/auth/signature?appId={appId}
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "appId": "66b7d3b5324b7fb7",
    "timestamp": 1710083200000,
    "signature": "abc123def456...",
    "secretKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "headers": {
      "X-App-Id": "66b7d3b5324b7fb7",
      "X-Timestamp": "1710083200000",
      "X-Signature": "abc123def456..."
    },
    "curlExample": "curl -X POST 'http://localhost:18087/dataservice/query/page/{apiId}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-App-Id: 66b7d3b5324b7fb7' \\\n  -H 'X-Timestamp: 1710083200000' \\\n  -H 'X-Signature: abc123def456...' \\\n  -d '{\"pageNum\":1,\"pageSize\":10}'"
  }
}
```

---

## 完整使用流程

### 步骤1：创建数据源

```bash
POST /dataservice/manage/datasource/add
{
  "datasourceName": "Doris测试库",
  "datasourceType": "doris",
  "host": "192.168.1.100",
  "port": 9030,
  "databaseName": "test_db",
  "username": "root",
  "password": "123456"
}
# 返回: datasourceId = 2037470682316664833
```

### 步骤2：创建API

```bash
POST /dataservice/manage/api/add
{
  "apiName": "船舶状态查询",
  "datasourceId": 2037470682316664833,
  "queryType": "table",
  "tableName": "ods_cii_ship_status_report_d",
  "fields": [
    {"fieldName": "ship_code", "fieldDesc": "船舶代码", "isFilter": 1},
    {"fieldName": "report_date", "fieldDesc": "报告日期"},
    {"fieldName": "voyage_no", "fieldDesc": "航次号"}
  ]
}
# 返回: apiId = 2037470682316664834
```

### 步骤3：创建用户

```bash
POST /dataservice/manage/user/add
{
  "userName": "测试应用",
  "email": "test@example.com"
}
# 返回: userId, appId, secretKey
```

### 步骤4：授权

```bash
POST /dataservice/manage/permission/add
{
  "userId": 2037470682316664835,
  "apiId": 2037470682316664834
}
```

### 步骤5：发布API

```bash
POST /dataservice/manage/api/publish/2037470682316664834
```

### 步骤6：生成Token

```bash
GET /dataservice/token/generate?appId=66b7d3b5324b7fb7&apiId=2037470682316664834&expireDays=30
# 返回: token
```

### 步骤7：调用API

```bash
POST /dataservice/query/page/2037470682316664834
Header: Authorization: Bearer <token>
Body: {
  "pageNum": 1,
  "pageSize": 10,
  "params": {"ship_code": "RuiNing6"},
  "sortField": "report_date",
  "sortOrder": "desc"
}
```

### 步骤8：查看API文档列表

```bash
GET /dataservice/doc/apis
```

用于展示所有已发布的API列表，方便用户浏览和选择。

### 步骤9：查看单个API文档

```bash
GET /dataservice/doc/api/2037470682316664834
```

获取单个API的完整文档信息，包括接口地址、请求参数、响应字段、示例代码等。

---

## 配置项

### application.yml

```yaml
dataservice:
  jwt:
    secret: abcdefghijklmnopqrstuvwxyz123456  # JWT密钥（至少32字符）
    expire-days: 7  # 默认Token过期天数
  dev-mode: false  # 开发模式（跳过认证）
  warmup:
    enabled: true  # 启动预热数据源
```

---

## 错误信息说明

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| API不存在 | API ID无效 | 检查API ID是否正确 |
| API未发布或已下线，无法访问 | API状态非已发布 | 先发布API |
| 用户不存在 | AppId无效 | 检查AppId是否正确 |
| 用户已禁用 | 用户状态为禁用 | 联系管理员启用用户 |
| 无权访问此API | 用户未被授权该API | 先授权 |
| Token已过期 | JWT Token过期 | 重新生成Token |
| 无效的Token | Token格式错误或被篡改 | 重新生成Token |
| Token无权访问该API | Token绑定的API与请求不匹配 | 使用正确的Token |
| 缺少Authorization头 | 未提供认证信息 | 添加认证头 |

---

## 九、API调用日志

系统自动记录所有API调用信息，用于监控和统计。

### 日志字段说明

| 字段 | 说明 |
|------|------|
| apiId | API ID |
| userId | 用户ID |
| appId | 应用ID |
| requestId | 请求唯一标识 |
| requestIp | 调用者IP地址 |
| requestParams | 请求参数 |
| responseCode | 响应状态码（200成功，500失败）|
| responseMsg | 响应消息 |
| responseTime | 响应时间（毫秒）|
| **dataSize** | **返回数据行数** |
| callTime | 调用时间 |

### 数据统计说明

- **dataSize字段**：记录本次调用返回的数据行数
  - 分页查询：返回当前页的数据条数
  - 列表查询：返回列表的数据条数
  - 单条查询：返回1或0
  - 异常时：返回0

### 统计查询示例

**查询API今日调用次数：**
```sql
SELECT api_id, COUNT(*) as call_count, AVG(response_time) as avg_time
FROM data_api_call_log 
WHERE DATE(call_time) = CURDATE()
GROUP BY api_id;
```

**查询用户调用统计：**
```sql
SELECT app_id, 
       COUNT(*) as total_calls,
       SUM(CASE WHEN response_code = 200 THEN 1 ELSE 0 END) as success_calls,
       AVG(response_time) as avg_response_time,
       AVG(dataSize) as avg_rows
FROM data_api_call_log 
WHERE call_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY app_id;
```

**查询API响应时间趋势：**
```sql
SELECT DATE(call_time) as date, 
       AVG(response_time) as avg_time,
       MAX(response_time) as max_time
FROM data_api_call_log 
WHERE api_id = 1
GROUP BY DATE(call_time)
ORDER BY date DESC
LIMIT 30;
```

注意：dataSize仅统计返回数据的行数，不统计字节大小，避免性能损耗。

---

## 十、API调用统计

### 10.1 API调用概览统计

**请求**
```
GET /dataservice/statistics/api/overview
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| apiId | Long | 否 | API ID | 1 |
| startDate | String | 否 | 开始日期 | 2026-03-01 |
| endDate | String | 否 | 结束日期 | 2026-03-30 |

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "totalCalls": 15234,
    "successCalls": 15100,
    "errorCalls": 134,
    "successRate": 99.12,
    "avgResponseTime": 45,
    "maxResponseTime": 1200,
    "minResponseTime": 12,
    "avgDataSize": 25,
    "totalDataSize": 380850
  }
}
```

---

### 10.2 API调用趋势

**请求**
```
GET /dataservice/statistics/api/trend
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| apiId | Long | 否 | API ID | 1 |
| userId | Long | 否 | 用户ID | 1 |
| startDate | String | 是 | 开始日期 | 2026-03-01 |
| endDate | String | 是 | 结束日期 | 2026-03-30 |

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "date": "2026-03-01",
      "callCount": 523,
      "successCount": 520,
      "errorCount": 3,
      "avgResponseTime": 42,
      "avgDataSize": 23
    },
    {
      "date": "2026-03-02",
      "callCount": 489,
      "successCount": 488,
      "errorCount": 1,
      "avgResponseTime": 45,
      "avgDataSize": 25
    }
  ]
}
```

---

### 10.3 调用次数Top API

**请求**
```
GET /dataservice/statistics/api/top
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| limit | Integer | 否 | 返回条数 | 10 |
| startDate | String | 否 | 开始日期 | - |
| endDate | String | 否 | 结束日期 | - |

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "apiId": 1,
      "apiName": "船舶状态报告查询",
      "callCount": 5234,
      "successCount": 5200,
      "avgResponseTime": 45,
      "avgDataSize": 25
    },
    {
      "apiId": 2,
      "apiName": "用户数据查询",
      "callCount": 4892,
      "successCount": 4880,
      "avgResponseTime": 32,
      "avgDataSize": 15
    }
  ]
}
```

---

### 10.4 用户调用概览

**请求**
```
GET /dataservice/statistics/user/overview
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| userId | Long | 否 | 用户ID | 1 |
| startDate | String | 否 | 开始日期 | 2026-03-01 |
| endDate | String | 否 | 结束日期 | 2026-03-30 |

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "totalCalls": 5234,
    "successCalls": 5200,
    "errorCalls": 34,
    "successRate": 99.35,
    "avgResponseTime": 42,
    "apiCount": 5,
    "totalDataSize": 130850
  }
}
```

---

### 10.5 调用次数Top用户

**请求**
```
GET /dataservice/statistics/user/top
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| limit | Integer | 否 | 返回条数 | 10 |
| startDate | String | 否 | 开始日期 | - |
| endDate | String | 否 | 结束日期 | - |

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "userId": 1,
      "userName": "测试应用",
      "appId": "66b7d3b5324b7fb7",
      "callCount": 5234,
      "apiCount": 3,
      "avgResponseTime": 45
    },
    {
      "userId": 2,
      "userName": "数据大屏",
      "appId": "77c8e4c6435c8gc8",
      "callCount": 3892,
      "apiCount": 2,
      "avgResponseTime": 38
    }
  ]
}
```

---

### 10.6 响应时间Top API

**请求**
```
GET /dataservice/statistics/responseTime/top
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| limit | Integer | 否 | 返回条数 | 10 |
| startDate | String | 否 | 开始日期 | - |
| endDate | String | 否 | 结束日期 | - |

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "apiId": 5,
      "apiName": "大数据量查询",
      "avgResponseTime": 850,
      "maxResponseTime": 2500,
      "callCount": 234
    },
    {
      "apiId": 3,
      "apiName": "复杂SQL查询",
      "avgResponseTime": 520,
      "maxResponseTime": 1800,
      "callCount": 456
    }
  ]
}
```

---

### 10.7 实时统计

**请求**
```
GET /dataservice/statistics/realtime
```

**响应示例**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "todayCalls": 1523,
    "todaySuccess": 1510,
    "todayErrors": 13,
    "todaySuccessRate": 99.15,
    "avgResponseTime": 45,
    "activeApis": 8,
    "activeUsers": 5,
    "lastCallTime": "2026-03-30 14:52:29"
  }
}
```
