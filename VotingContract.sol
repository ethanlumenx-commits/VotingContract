// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VotingContract is Ownable{
    IERC20 public token;
    uint public costPerVote = 1 * 10**18;

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    struct Candidate {
        uint id;
        string name;
        uint voteCount;
        uint endVoteTime;
    }

    struct VotingRound {
        uint startTime;
        uint endTime;
        uint round;
        string votingName;
        bool ended;
        mapping(address => bool) hasVoted;
        Candidate[] Candidatelist;
    }

    VotingRound[] public votingRoundslist;

    // 创建投票
    function startVoting(
        uint startTime, 
        uint endTime,
        string memory votingName)
        external onlyOwner{
        require(startTime < endTime, "Invalid voting period");
        
        uint roundlength = votingRoundslist.length;
        votingRoundslist.push(); // struct 里有mapping不能直接push ,用storage重新赋值
        VotingRound storage round = votingRoundslist[roundlength]; // 引用存储里的新元素
        round.startTime = startTime;
        round.endTime = endTime;
        round.round = roundlength;
        round.ended = false;
        round.votingName = votingName;
    }

    // 添加候选人
    function addCandidate(string memory _name, uint votingRound) external onlyOwner {
        require(votingRound < votingRoundslist.length, "Invalid voting round");
        uint id = votingRoundslist[votingRound].Candidatelist.length;
        votingRoundslist[votingRound].Candidatelist.push(Candidate(id, _name, 0,0));
    }

    // 投票
    function vote(uint votingRound, uint candidateIndex) public {
        require(votingRound < votingRoundslist.length, "Invalid voting round");
        require(candidateIndex < votingRoundslist[votingRound].Candidatelist.length, "Invalid candidate index");
        require(!votingRoundslist[votingRound].hasVoted[msg.sender], "You have already voted");
        require(block.timestamp >= votingRoundslist[votingRound].startTime && block.timestamp <= votingRoundslist[votingRound].endTime, "Voting is not active");
        require(!votingRoundslist[votingRound].ended, "Vote is closed");
        // 扣除代币
        require(token.transferFrom(msg.sender, address(this), costPerVote), "Token transfer failed");

        votingRoundslist[votingRound].Candidatelist[candidateIndex].voteCount++;
        votingRoundslist[votingRound].Candidatelist[candidateIndex].endVoteTime = block.timestamp;
        votingRoundslist[votingRound].hasVoted[msg.sender] = true;
    }

    // 获取某一轮投票信息
    function getVotingRound(uint votingRound) external view 
    returns (uint startTime, uint endTime, uint round, string memory votingName, bool ended) {
        require(votingRound < votingRoundslist.length, "Invalid voting round");
        VotingRound storage roundData = votingRoundslist[votingRound];
        return (roundData.startTime, roundData.endTime, roundData.round, roundData.votingName, roundData.ended);
    }

    // 获取某一轮候选人列表状态
    function getCandidates(uint votingRound) external view returns (Candidate[] memory) {
        require(votingRound < votingRoundslist.length, "Invalid voting round");
        return votingRoundslist[votingRound].Candidatelist;
    }

    // 获取某一轮的winner
    function getWinner(uint votingRound) external view returns (string memory) {
        require(votingRound < votingRoundslist.length, "Invalid voting round");
        Candidate[] memory roundData = votingRoundslist[votingRound].Candidatelist;
        require(roundData.length > 0, "No candidates in this round");

        uint winningVoteCount = 0;
        string memory winnerName = "";
         uint earliestEndTime = type(uint).max;  // 初始化为最大值

        for (uint i = 0; i < roundData.length; i++) {
            // 投票次数最多 ||  （投票次数相同，最早结束时间）
            if (roundData[i].voteCount > winningVoteCount || (roundData[i].voteCount == winningVoteCount && roundData[i].endVoteTime < earliestEndTime)) {
                winningVoteCount = roundData[i].voteCount;
                winnerName = roundData[i].name;
                earliestEndTime = roundData[i].endVoteTime;
            }
        }
        return winnerName;
    }

    
    // 手动结束投票
    function endVoting(uint votingRound) external onlyOwner {
        require(votingRound < votingRoundslist.length, "Invalid voting round");
        require(!votingRoundslist[votingRound].ended, "Voting has already ended");
        votingRoundslist[votingRound].ended = true;
    }

    // 转移合约代币
    function withdrawTokens(address to, uint amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        require(token.transfer(to, amount), "Token transfer failed");
    }


}