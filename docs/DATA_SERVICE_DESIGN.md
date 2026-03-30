# 数据服务功能设计文档

## 一、概述

数据 API 服务是一个 Java 17 后台服务，将 Doris 数据表映射成 API，提供给使用方使用。支持访问频率限制、超时设置、用户鉴权、数据权限管理等功能。

### 核心特性

- **动态数据源**：支持 MySQL/Doris/PostgreSQL，可页面配置添加删除
- **双模式查询**：表查询模式 / SQL 查询模式
- **多层权限**：API 权限 + 字段权限 + 内容权限
- **自动文档**：一键生成 API 文档和 CURL 命令
- **元数据解析**：自动解析表结构和 SQL 字段

---

## 二、数据库设计 (MySQL)

### 2.1 数据源配置表 `data_datasource`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 ID |
| datasource_name | VARCHAR(100) | 数据源名称 |
| datasource_type | VARCHAR(50) | 类型：mysql/doris/postgresql |
| host | VARCHAR(200) | 主机地址 |
| port | INT | 端口 |
| database_name | VARCHAR(100) | 数据库名 |
| username | VARCHAR(100) | 用户名 |
| password | VARCHAR(200) | 密码（加密存储） |
| extra_params | VARCHAR(500) | 额外连接参数 |
| status | TINYINT | 状态：0-禁用 1-启用 |
| remark | VARCHAR(500) | 备注 |

### 2.2 API 配置表 `data_api`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 ID |
| api_name | VARCHAR(100) | API 名称 |
| api_path | VARCHAR(200) | API 访问路径 |
| api_desc | VARCHAR(500) | API 描述 |
| query_type | TINYINT | 查询类型：1-表查询 2-SQL 查询 |
| datasource_id | BIGINT | 数据源 ID |
| table_name | VARCHAR(200) | 表名（表查询时使用） |
| sql_content | TEXT | SQL 内容（SQL 查询时使用） |
| query_params | TEXT | 查询参数配置 JSON |
| default_rate_limit | INT | 默认访问频率限制（次/分钟） |
| default_timeout | INT | 默认超时时间（秒） |
| status | TINYINT | 状态：0-禁用 1-启用 |

### 2.3 API 用户表 `data_api_user`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 ID |
| user_name | VARCHAR(100) | 用户名称 |
| app_id | VARCHAR(64) | 应用 ID |
| secret_key | VARCHAR(128) | 密钥 |
| email | VARCHAR(100) | 邮箱 |
| phone | VARCHAR(20) | 手机号 |
| status | TINYINT | 状态：0-禁用 1-启用 |
| expire_time | DATETIME | 过期时间 |
| remark | VARCHAR(500) | 备注 |

### 2.4 API 字段配置表 `data_api_field`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 ID |
| api_id | BIGINT | API 配置 ID |
| field_name | VARCHAR(100) | 字段名 |
| field_alias | VARCHAR(100) | 字段别名 |
| field_type | VARCHAR(50) | 字段类型 |
| field_desc | VARCHAR(500) | 字段描述 |
| is_required | TINYINT | 是否必填：0-否 1-是 |
| is_filter | TINYINT | 是否可筛选：0-否 1-是 |
| is_sort | TINYINT | 是否可排序：0-否 1-是 |
| default_value | VARCHAR(200) | 默认值 |
| sort_order | INT | 排序号 |

### 2.5 用户 API 权限表 `data_api_user_permission`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 ID |
| user_id | BIGINT | 用户 ID |
| api_id | BIGINT | API 配置 ID |
| permission_type | TINYINT | 权限类型：1-只读 2-读写 |
| rate_limit | INT | 访问频率限制（次/分钟），为空使用 API 默认值 |
| daily_limit | INT | 每日调用限制，为空不限制 |
| status | TINYINT | 状态：0-禁用 1-启用 |
| expire_time | DATETIME | 权限过期时间 |

### 2.6 用户字段权限表 `data_api_user_field`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 ID |
| user_id | BIGINT | 用户 ID |
| api_id | BIGINT | API 配置 ID |
| field_id | BIGINT | 字段 ID |
| field_permission | TINYINT | 字段权限：1-可见 2-脱敏 3-隐藏 |
| content_filter_type | TINYINT | 内容过滤类型：1-白名单 2-黑名单 |
| content_filter_values | TEXT | 内容过滤值，多个用逗号分隔 |

### 2.7 API 调用日志表 `data_api_call_log`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 ID |
| api_id | BIGINT | API 配置 ID |
| user_id | BIGINT | 用户 ID |
| app_id | VARCHAR(64) | 应用 ID |
| request_id | VARCHAR(64) | 请求 ID |
| request_ip | VARCHAR(50) | 请求 IP |
| request_params | TEXT | 请求参数 |
| response_code | INT | 响应状态码 |
| response_msg | VARCHAR(500) | 响应消息 |
| response_time | INT | 响应时间（毫秒） |
| data_size | INT | 返回数据量 |
| call_time | DATETIME | 调用时间 |

---

## 三、模块结构

```
src/main/java/net/zdiai/bigdata/
├── config/
│   └── DataServiceWebConfig.java        # Web 配置 (拦截器)
├── controller/
│   ├── DataApiManageController.java     # API 配置管理
│   ├── DataApiUserManageController.java # 用户管理
│   ├── DataApiPermissionManageController.java # 权限管理
│   ├── DataDatasourceManageController.java # 数据源管理
│   ├── DataQueryController.java         # 动态查询入口
│   └── DataApiDocController.java        # API 文档生成
├── enums/
│   ├── QueryTypeEnum.java               # 查询类型枚举
│   ├── FieldPermissionEnum.java         # 字段权限枚举
│   ├── ContentFilterTypeEnum.java       # 内容过滤类型枚举
│   ├── StatusEnum.java                  # 状态枚举
│   └── PermissionTypeEnum.java          # 权限类型枚举
├── handler/
│   └── DataApiLogAspect.java            # API 调用日志切面
├── interceptor/
│   └── ApiAuthInterceptor.java          # 用户鉴权拦截器
├── mapper/
│   ├── DataApiMapper.java               # API 配置 Mapper
│   ├── DataApiUserMapper.java           # 用户 Mapper
│   ├── DataApiFieldMapper.java          # 字段配置 Mapper
│   ├── DataApiUserPermissionMapper.java # 用户权限 Mapper
│   ├── DataApiUserFieldMapper.java      # 用户字段权限 Mapper
│   ├── DataApiCallLogMapper.java        # 调用日志 Mapper
│   ├── DataDatasourceMapper.java        # 数据源 Mapper
│   ├── DynamicQueryMapper.java          # 动态查询 Mapper
│   ├── DataApiExtMapper.java            # API 扩展 Mapper
│   └── DataApiUserExtMapper.java        # 用户扩展 Mapper
├── pojo/
│   ├── entity/                          # 实体类 (数据库映射)
│   ├── dto/                             # 数据传输对象 (请求参数)
│   └── vo/                              # 视图对象 (返回数据)
├── service/
│   ├── IDataApiService.java             # API 配置服务
│   ├── IDataApiUserService.java         # 用户服务
│   ├── IDataApiFieldService.java        # 字段配置服务
│   ├── IDataApiUserPermissionService.java # 用户权限服务
│   ├── IDataApiUserFieldService.java    # 用户字段权限服务
│   ├── IDataApiCallLogService.java      # 调用日志服务
│   ├── IDataDatasourceService.java      # 数据源服务
│   ├── IDynamicQueryService.java        # 动态查询服务
│   ├── IMetadataService.java            # 元数据服务
│   ├── IDataApiRateLimitService.java    # 限流服务
│   └── impl/                            # 服务实现类
└── utils/
    └── IotUtil.java                     # 工具类
```

---

## 四、核心功能

### 4.1 动态数据源管理

- **添加数据源**：通过页面配置新增 MySQL/Doris/PostgreSQL 连接
- **测试连接**：实时测试数据源连通性
- **获取元数据**：自动获取表列表、字段信息、预览数据
- **动态切换**：查询时根据 API 配置动态切换数据源

### 4.2 双模式查询

#### 表查询模式
1. 选择数据源和表
2. 自动解析表字段（字段名、类型、描述）
3. 构建 SELECT 语句
4. 支持分页、排序、筛选

#### SQL 查询模式
1. 编写 SQL 模板，支持 `${param}` 参数化
2. 自动解析 SQL 字段
3. 执行 SQL 并返回结果

### 4.3 用户鉴权

```
请求头:
  X-App-Id: xxxxxxxxxxxxxxxx
  X-Timestamp: 1711234567890
  X-Signature: md5(appId + timestamp + secretKey)
```

- AppId 唯一标识应用
- SecretKey 用于签名验证
- 签名有效期 5 分钟
- 防止重放攻击

### 4.4 三层权限控制

#### 第一层：API 权限
- 用户只能访问被授权的 API
- 每个 API 可配置独立访问频率限制
- 每日调用次数限制

#### 第二层：字段权限
- 可见：正常返回
- 脱敏：部分字符替换为*
- 隐藏：不返回该字段

#### 第三层：内容权限
- 白名单：只返回指定值（如 code IN (1,2,3)）
- 黑名单：排除指定值（如 code NOT IN (5,6)）

### 4.5 访问控制

- **速率限制**：Redis 令牌桶算法，按 API+ 用户维度
- **超时控制**：数据库查询超时配置
- **调用日志**：AOP 记录所有 API 调用

---

## 五、API 接口

### 5.1 数据源管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/dataservice/manage/datasource/add` | 新增数据源 |
| POST | `/dataservice/manage/datasource/update` | 修改数据源 |
| POST | `/dataservice/manage/datasource/delete` | 删除数据源 |
| GET | `/dataservice/manage/datasource/get/{id}` | 查询数据源详情 |
| POST | `/dataservice/manage/datasource/test/{id}` | 测试连接 |
| GET | `/dataservice/manage/datasource/tables/{datasourceId}` | 获取表列表 |
| GET | `/dataservice/manage/datasource/columns/{datasourceId}` | 获取字段列表 |
| GET | `/dataservice/manage/datasource/preview/{datasourceId}` | 预览数据 |

### 5.2 API 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/dataservice/manage/api/add` | 新增 API |
| POST | `/dataservice/manage/api/update` | 修改 API |
| POST | `/dataservice/manage/api/delete` | 删除 API |
| GET | `/dataservice/manage/api/get/{id}` | 查询 API 详情 |
| POST | `/dataservice/manage/api/page` | 分页查询 |
| POST | `/dataservice/manage/api/list` | 列表查询 |
| POST | `/dataservice/manage/api/status` | 启用/禁用 |
| GET | `/dataservice/manage/api/parseTableFields` | 解析表字段 |
| POST | `/dataservice/manage/api/parseSqlFields` | 解析 SQL 字段 |
| GET | `/dataservice/manage/api/previewTableData` | 预览表数据 |

### 5.3 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/dataservice/manage/user/add` | 新增用户 |
| POST | `/dataservice/manage/user/update` | 修改用户 |
| POST | `/dataservice/manage/user/delete` | 删除用户 |
| GET | `/dataservice/manage/user/get/{id}` | 查询用户详情 |
| POST | `/dataservice/manage/user/resetSecret/{id}` | 重置密钥 |
| POST | `/dataservice/manage/user/status` | 启用/禁用 |

### 5.4 权限管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/dataservice/manage/permission/add` | 新增权限 |
| POST | `/dataservice/manage/permission/update` | 修改权限 |
| POST | `/dataservice/manage/permission/delete` | 删除权限 |
| GET | `/dataservice/manage/permission/get/{id}` | 查询权限详情 |
| GET | `/dataservice/manage/permission/listByUser/{userId}` | 用户权限列表 |
| GET | `/dataservice/manage/permission/listByApi/{apiId}` | API 权限列表 |
| POST | `/dataservice/manage/permission/page` | 分页查询 |

### 5.5 动态查询

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/dataservice/query/page/{apiId}` | 分页查询 |
| POST | `/dataservice/query/list/{apiId}` | 列表查询 |
| POST | `/dataservice/query/one/{apiId}` | 单条查询 |

### 5.6 API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dataservice/doc/api/{id}` | 获取 API 文档 |
| GET | `/dataservice/doc/api/{id}/curl` | 生成 CURL 命令 |

---

## 六、使用示例

### 6.1 创建数据源

```json
POST /dataservice/manage/datasource/add
{
  "datasourceName": "生产 Doris",
  "datasourceType": "doris",
  "host": "172.16.2.103",
  "port": 9030,
  "databaseName": "mydb",
  "username": "root",
  "password": "xxx"
}
```

### 6.2 创建表查询 API

```json
POST /dataservice/manage/api/add
{
  "apiName": "用户信息查询",
  "apiPath": "/user/info",
  "apiDesc": "查询用户详细信息",
  "queryType": 1,
  "datasourceId": 1,
  "tableName": "user_info",
  "defaultRateLimit": 100,
  "defaultTimeout": 30,
  "fields": [
    {
      "fieldName": "user_id",
      "fieldAlias": "userId",
      "fieldType": "BIGINT",
      "fieldDesc": "用户 ID",
      "isRequired": 1,
      "isFilter": 1,
      "sortOrder": 1
    },
    {
      "fieldName": "user_name",
      "fieldAlias": "userName",
      "fieldType": "VARCHAR",
      "fieldDesc": "用户名",
      "isRequired": 0,
      "isFilter": 1,
      "sortOrder": 2
    }
  ]
}
```

### 6.3 授予用户权限

```json
POST /dataservice/manage/permission/add
{
  "userId": 100,
  "apiId": 1,
  "permissionType": 1,
  "rateLimit": 50,
  "dailyLimit": 1000,
  "fieldPermissions": [
    {
      "fieldId": 1,
      "fieldPermission": 1,
      "contentFilterType": 1,
      "contentFilterValues": "1,2,3"
    },
    {
      "fieldId": 2,
      "fieldPermission": 2,
      "contentFilterType": null,
      "contentFilterValues": null
    }
  ]
}
```

### 6.4 调用 API

```bash
curl -X POST 'http://localhost:18087/dataservice/query/page/1' \
  -H 'Content-Type: application/json' \
  -H 'X-App-Id: abc123def456' \
  -H 'X-Timestamp: 1711234567890' \
  -H 'X-Signature: xxxxx' \
  -d '{
    "pageNum": 1,
    "pageSize": 10,
    "params": {
      "userId": 100
    }
  }'
```

---

## 七、部署步骤

1. **执行 SQL 建表**
   ```sql
   source src/main/resources/sql/data_service.sql
   ```

2. **配置数据源**
   - 修改 `application-db.yaml` 中的 Doris 连接信息

3. **启动服务**
   ```bash
   mvn spring-boot:run
   ```

4. **访问 Swagger 文档**
   ```
   http://localhost:18087/swagger-ui/index.html
   ```

---

## 八、技术栈

- **JDK**: 17
- **Spring Boot**: 3.x
- **MyBatis Plus**: 动态数据源
- **Redis**: 限流、缓存
- **Redisson**: 分布式锁
- **Hutool**: 工具库
- **Doris**: 数据分析型数据库
- **Druid**: 数据库连接池

---

## 九、注意事项

1. **密码加密**：数据源密码建议加密存储
2. **签名安全**：SecretKey 妥善保管，定期更换
3. **性能优化**：大表查询建议加索引和分页限制
4. **监控告警**：建议接入日志监控系统
5. **备份策略**：定期备份元数据表
