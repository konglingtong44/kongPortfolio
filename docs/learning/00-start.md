# 00｜账号、认证和工具

[学习路线](../../AWS_LEARNING_GUIDE.md) · 下一章：[本地运行](01-local.md)

目标：用本机临时凭证访问自己的AWS账号，准备开发工具。本章不创建网站资源。

## 1. 准备AWS身份

公司账号向管理员取得访问门户、SSO区域和已分配的权限；不自行修改组织。自己的新练习账号可以按以下控制台顺序准备：

1. 注册并验证AWS账号和付款方式。根用户开启MFA，仅用于账号级设置。
2. 搜索 **IAM Identity Center → 选择长期使用的区域 → Enable／启用**。如提示创建AWS Organizations，阅读后确认。需要分配AWS账号权限时使用**组织实例**，不是仅供应用访问的账号实例。
3. **Users → Add user**，填写自己的信息，按邀请设置密码。
4. **Permission sets → Create permission set**。独立练习账号的初始化管理员可用预定义 `AdministratorAccess`；它能修改整个账号。团队账号用管理员发放的权限，不能把本例当生产最小权限设计。
5. **AWS accounts → 目标账号 → Assign users or groups**，选择用户和权限集后提交。
6. 在设置／Dashboard记录 **AWS access portal URL** 和Identity Center区域；通过门户登录，确认能进入目标账号。

应用使用东京 `ap-northeast-1`，SSO区域是身份目录所在区域，两者不一定相同。CloudFront证书的 `us-east-1` 另有用途。[AWS账号访问配置](https://docs.aws.amazon.com/singlesignon/latest/userguide/quick-start-default-idc.html)

## 2. 安装工具并检查

安装来源：[Git](https://git-scm.com/downloads)、[Node](https://nodejs.org/en/download)、[JDK21](https://adoptium.net/temurin/releases/?version=21)、[Maven](https://maven.apache.org/install.html)、[AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)、[Terraform](https://developer.hashicorp.com/terraform/install)、[Gitleaks](https://github.com/gitleaks/gitleaks/releases)。加入PATH后重新打开PowerShell：

```powershell
git --version
node --version
npm.cmd --version
java -version
mvn.cmd -version
aws --version
terraform version
gitleaks version
```

本项目要求Node24.x、JDK21、Maven3.9.11+、Terraform1.10以上且小于2。AWS CI固定Gitleaks8.30.1，`.terraform.lock.hcl`锁定Provider。Docker可选，本路线不依赖它。

`java`找不到时设置JDK的 `JAVA_HOME` 和 `bin` PATH；其他命令找不到时先修PATH，不照抄作者电脑上的程序路径。

## 3. CLI登录

任意目录运行一次：

```powershell
aws configure sso --profile kong-dev
```

| 提示 | 填写内容 |
|---|---|
| SSO session name | 自己能辨认的名称，如 `portfolio-learning` |
| SSO start URL | 上一步的AWS访问门户 |
| SSO region | Identity Center区域 |
| SSO registration scopes | 接受 `sso:account:access` |
| Account / Role | 自己的目标账号、已分配权限集 |
| Default client Region | `ap-northeast-1` |
| Default output format | `json` |

```powershell
aws sso login --profile kong-dev
aws sts get-caller-identity --profile kong-dev
```

STS只查询当前身份；核对 `Account` 是目标12位账号。登录过期重跑login。不能自动开浏览器时用 `aws sso login --profile kong-dev --no-browser --use-device-code`，按本次输出完成登录，不复用旧验证码。网页登录不会自动更新CLI凭证。[CLI配置说明](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)

不用长期Access Key，不把密码、令牌或 `.env` 写入仓库。

## 4. 获取源码

已有维护者直接进入原工作区。新读者先Fork自己的仓库，保留 `feat/aws-serverless-ci` 分支；若Fork只复制默认分支，需要另行复制该分支。

```powershell
# OWNER替换为自己的GitHub名称。
git clone --branch feat/aws-serverless-ci https://github.com/<OWNER>/kongPortfolio.git
Set-Location kongPortfolio
git status --short
```

`main`曾是旧基线，不代表教材应用版本。候选构建需要Git提交信息，不用下载ZIP代替完整Git工作区。

## 5. 建立终端共用变量

在仓库根目录用编辑器创建 `.local` 文件夹及 `.local/learning-context.ps1`，写入下面内容。它读取身份并定义本地辅助函数，不创建AWS资源：

```powershell
$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $RepoRoot
. ./scripts/tools.ps1
$env:AWS_PROFILE = 'kong-dev'
$env:AWS_DEFAULT_REGION = 'ap-northeast-1'
$env:AWS_PAGER = ''
$AccountId = (aws sts get-caller-identity --query Account --output text).Trim()
if ($LASTEXITCODE -ne 0 -or $AccountId -notmatch '^\d{12}$') { throw '先恢复SSO并核对账号。' }
$StateBucket = "kongportfolio-tfstate-$AccountId-ap-northeast-1"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# 合并本地JSON：保留原字段，只改明确给出的字段。
function Set-LearningJson([string]$Path, [hashtable]$Patch) {
    $values = @{}
    if (Test-Path -LiteralPath $Path) {
        $old = Get-Content -Raw -Encoding utf8 -LiteralPath $Path | ConvertFrom-Json
        foreach ($item in $old.PSObject.Properties) { $values[$item.Name] = $item.Value }
    }
    foreach ($key in $Patch.Keys) { $values[$key] = $Patch[$key] }
    [IO.File]::WriteAllText([IO.Path]::GetFullPath($Path), ($values | ConvertTo-Json -Depth 12), $Utf8NoBom)
}
Write-Host "工作区：$RepoRoot；AWS账号：$AccountId；区域：$env:AWS_DEFAULT_REGION"
```

每次开新终端，进入仓库后运行：

```powershell
. ./.local/learning-context.ps1
```

点号加空格表示加载到当前终端。`$AccountId`来自真实STS响应，先核对账号再继续。`Set-LearningJson`只修改本地文件，会替换整个指定字段，嵌套对象应给完整内容。

## 完成标准与排错

| 现象 | 处理 |
|---|---|
| 门户没有目标账号／角色 | 回Identity Center查用户和账号分配 |
| `Token has expired` | 重新SSO登录，再查STS |
| `AccessDenied` | 查权限集、目标账号和组织限制，不靠改项目名绕过 |
| 账号不正确 | 停止后续操作，修正profile |
| 工具可运行、账号正确 | 进入[01](01-local.md) |
