# VotingContract - 去中心化投票系统

## 项目简介

这是一个基于 Solidity 智能合约的去中心化投票系统，支持多轮投票、ERC20代币支付投票费用、候选人管理等功能。合约使用 OpenZeppelin 库实现所有权控制，确保只有合约所有者可以创建投票轮次和管理候选人。

## 功能特性

### 核心功能

1. **多轮投票支持**
   - 支持创建多个独立的投票轮次
   - 每轮投票可设置独立的开始时间和结束时间
   - 每轮投票有独立的名称和候选人列表

2. **候选人管理**
   - 合约所有者可以为任意投票轮次添加候选人
   - 每个候选人包含ID、姓名、得票数和最后投票时间
   - 候选人信息在链上永久存储

3. **代币投票机制**
   - 用户投票需要消耗 ERC20 代币（默认每次投票消耗 1 token）
   - 通过 `transferFrom` 机制从投票者账户扣除代币
   - 收集的代币存储在合约中，所有者可以提取

4. **投票规则**
   - 每个地址在每轮投票中只能投票一次
   - 只能在投票有效期内进行投票
   - 支持手动提前结束投票

5. **结果统计**
   - 查询任意投票轮次的基本信息（时间、名称、状态等）
   - 获取某轮投票的所有候选人及其得票情况
   - 自动计算获胜者（票数最多者获胜；平票时比较投票时间，最早完成投票者获胜）

6. **权限控制**
   - 使用 OpenZeppelin 的 Ownable 合约
   - 只有合约所有者可以：创建投票轮次、添加候选人、结束投票、提取代币

### 主要函数

- `startVoting(startTime, endTime, votingName)` - 创建新的投票轮次
- `addCandidate(name, votingRound)` - 为指定轮次添加候选人
- `vote(votingRound, candidateIndex)` - 对指定轮次的候选人投票
- `getVotingRound(votingRound)` - 获取投票轮次信息
- `getCandidates(votingRound)` - 获取候选人列表
- `getWinner(votingRound)` - 获取获胜者
- `endVoting(votingRound)` - 手动结束投票
- `withdrawTokens(to, amount)` - 提取合约中的代币

## 技术栈

- **Solidity**: ^0.8.2 <0.9.0
- **OpenZeppelin Contracts**: 用于访问控制和 ERC20 接口
- **Hardhat**: 开发和测试环境
- **TypeScript**: 测试脚本编写
- **Chai & Ethers.js**: 测试断言和区块链交互

## 安装与设置

### 前置要求

- Node.js (推荐 v16+)
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 编译合约

```bash
npx hardhat compile
```

## 运行测试

项目包含完整的测试套件，覆盖所有核心功能和边界情况：

```bash
npx hardhat test
```

### 测试覆盖场景

#### 1. 投票轮次创建测试
- ✅ 正常创建投票轮次（设置名称、开始/结束时间）
- ✅ 非所有者无法创建投票轮次
- ✅ 开始时间大于结束时间时创建失败

#### 2. 候选人管理测试
- ✅ 未创建轮次时添加候选人失败
- ✅ 成功为指定轮次添加候选人
- ✅ 支持多轮投票分别添加不同候选人
- ✅ 非所有者无法添加候选人

#### 3. 投票功能测试
- ✅ 余额不足时投票失败
- ✅ 授权后成功投票并扣除代币
- ✅ 验证投票者和合约的代币余额变化
- ✅ 同一地址重复投票被拒绝
- ✅ 投票未在有效期内时被拒绝

#### 4. 获胜者判定测试
- ✅ 多票情况下正确识别获胜者
- ✅ 平票时根据投票时间判定（最早完成投票者获胜）

#### 5. 投票结束功能测试
- ✅ 非所有者无法结束投票
- ✅ 所有者成功结束投票
- ✅ 结束后无法继续投票
- ✅ 已结束的投票不能重复结束

## 使用示例

### 部署合约

```typescript
// 首先部署一个 ERC20 代币合约（如 MiniBank）
const miniBank = await ethers.deployContract("MiniBank");

// 部署投票合约，传入代币地址
const voting = await ethers.deployContract("VotingContract", [miniBank.address]);
```

### 创建投票轮次

```typescript
const startTime = Math.floor(Date.now() / 1000) + 10;
const endTime = startTime + 1000;
await voting.startVoting(startTime, endTime, "第一轮投票");
```

### 添加候选人

```typescript
await voting.addCandidate("Alice", 0);
await voting.addCandidate("Bob", 0);
```

### 用户投票

```typescript
// 用户需要先获得代币并授权
await miniBank.mint(userAddress, ethers.parseEther("100"));
await miniBank.connect(user).approve(voting.address, ethers.parseEther("1"));

// 进行投票
await voting.connect(user).vote(0, 0); // 给第0轮的第0个候选人投票
```

### 查询结果

```typescript
// 获取投票轮次信息
const roundInfo = await voting.getVotingRound(0);

// 获取候选人列表
const candidates = await voting.getCandidates(0);

// 获取获胜者
const winner = await voting.getWinner(0);
```

## 合约架构

```
VotingContract
├── Ownable (访问控制)
├── IERC20 (代币接口)
├── 数据结构
│   ├── Candidate (候选人)
│   │   ├── id
│   │   ├── name
│   │   ├── voteCount
│   │   └── endVoteTime
│   └── VotingRound (投票轮次)
│       ├── startTime
│       ├── endTime
│       ├── round
│       ├── votingName
│       ├── ended
│       ├── hasVoted (mapping)
│       └── Candidatelist
└── 核心功能
    ├── 投票管理
    ├── 候选人管理
    ├── 结果统计
    └── 代币管理
```

## 注意事项

1. **代币授权**: 用户在投票前必须先授权合约使用其代币
2. **投票时间**: 确保在投票有效期内进行投票
3. **Gas 优化**: 合约使用数组索引而非字符串比对来降低 Gas 消耗
4. **平票处理**: 当多个候选人票数相同时，系统会根据最后投票时间来判定获胜者
5. **安全性**: 所有敏感操作都有严格的权限控制和参数验证

## 可扩展方向

- [ ] 支持投票撤销和修改
- [ ] 增加投票权重机制
- [ ] 支持匿名投票
- [ ] 添加投票提案功能
- [ ] 集成 IPFS 存储候选人详细信息

## 许可证

GPL-3.0

## 贡献

欢迎提交 Issue 和 Pull Request！
