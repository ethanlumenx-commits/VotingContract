import { expect } from "chai";
import { ethers } from "hardhat";
import { VotingContract } from "../typechain-types";
import { MiniBank } from "../typechain-types";

describe("VotingContract", function () {
  
    let voting: VotingContract;
    let owner:any,arr1:any,arr2:any,arr3:any;
    let miniBank: MiniBank;


  beforeEach(async function () {
    const miniBankFactory = (await ethers.getContractFactory("MiniBank"));
    miniBank = (await miniBankFactory.deploy()) as MiniBank;
    await miniBank.waitForDeployment();
    [owner, arr1, arr2, arr3] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("VotingContract");
    voting = (await Voting.deploy(await miniBank.getAddress())) as VotingContract;
    await voting.waitForDeployment();

  });

  it("创建投票，输入投票名称，开始结束时间", async function () {
    const startTTime = (await ethers.provider.getBlock("latest"))!.timestamp + 10;
    const endTime = startTTime + 1000;
    await voting.startVoting(startTTime,endTime,"firstRound Vote");

    const round = await voting.getVotingRound(0);
    expect(round.votingName).to.equal("firstRound Vote");
    expect(round.startTime).to.equal(startTTime);
    expect(round.endTime).to.equal(endTime);
    expect(round.ended).to.be.false;
    expect(round.round).to.equal(0);
  });

  it("非owner无法创建投票", async function () {
    const startTTime = (await ethers.provider.getBlock("latest"))!.timestamp + 10;
    const endTime = startTTime + 1000;
    await expect(voting.connect(arr1).startVoting(startTTime,endTime,"firstRound Vote")).to.be.revertedWithCustomError(voting,"OwnableUnauthorizedAccount").withArgs(arr1.address);
  });
  it("创建投票开始时间大于结束时间无法创建", async function () {
    const startTTime = (await ethers.provider.getBlock("latest"))!.timestamp + 10;
    const endTime = startTTime - 1000;
    await expect(voting.startVoting(startTTime,endTime,"firstRound Vote")).to.be.revertedWith("Invalid voting period");
  });

  it("没创建的情况下往第0轮添加候选人",async function () {
    await expect(voting.addCandidate("Alice",0)).to.be.revertedWith("Invalid voting round");
  });

  it("创建第0轮并往里添加候选人",async function () {
    const startTTime = (await ethers.provider.getBlock("latest"))!.timestamp + 10;
    const endTime = startTTime + 1000;
    await voting.startVoting(startTTime,endTime,"firstRound Vote");
    await voting.addCandidate("Alice",0);
    const round = await voting.getCandidates(0);
    expect(round.length).to.equal(1);
    expect(round[0].name).to.equal("Alice");
  });

  it("创建多轮并往里添加候选人",async function () {
    const startTTime = (await ethers.provider.getBlock("latest"))!.timestamp + 10;
    const endTime = startTTime + 1000;
    await voting.startVoting(startTTime,endTime,"firstRound Vote");
    await voting.startVoting(startTTime,endTime,"secondRound Vote");

    await voting.addCandidate("Alice",0);
    await voting.addCandidate("Bob",1);
    const round1 = await voting.getCandidates(0);
    const round2 = await voting.getCandidates(1);
    expect(round1.length).to.equal(1);
    expect(round1[0].name).to.equal("Alice");
    expect(round2.length).to.equal(1);
    expect(round2[0].name).to.equal("Bob");

  });

  it("非 owner 往任意轮次添加候选人应该报错", async function () {
    const startTTime = (await ethers.provider.getBlock("latest"))!.timestamp + 10;
    const endTime = startTTime + 1000;
    await voting.startVoting(startTTime,endTime,"firstRound Vote");

    await expect(
      voting.connect(arr1).addCandidate("Eve", 0)
    ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
      .withArgs(arr1.address);
  });

  it("投票成功 & 不能重复投票", async function () {
    const startTTime = (await ethers.provider.getBlock("latest"))!.timestamp;
    const endTime = startTTime + 1000;
    await voting.startVoting(startTTime,endTime,"firstRound Vote");

    await voting.addCandidate("Alice", 0);
    await voting.addCandidate("Bob", 0);

    // addr1 给 Alice 投票，余额不足授权转账应该custom error
    await expect(
      voting.connect(arr1).vote(0, 0)
    ).to.be.reverted;

    // mint后  授权投票，避免5%的限制，给100
    await miniBank.mint(arr1.address, ethers.parseEther("100"));
    await miniBank.connect(arr1).approve(voting.getAddress(), ethers.parseEther("1"));
    await voting.connect(arr1).vote(0, 0);
    // arr1的余额应该是 99
    await expect(miniBank.balanceOf(arr1.address)).to.eventually.equal(ethers.parseEther("99"));
    // 合约余额应该是0.98
    await expect(miniBank.balanceOf(voting.getAddress())).to.eventually.equal(ethers.parseEther("0.98"));

    // addr1 再次投票 -> 应该报错
    await expect(voting.connect(arr1).vote(0, 1))
      .to.be.revertedWith("You have already voted");
  });

  it("不能在未开始或已结束的时间投票", async function () {
    const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
    await voting.startVoting(currentTime + 100, currentTime + 200, "Round2");
    await voting.addCandidate("Alice", 0);

    // mint后  授权投票，避免5%的限制，给100
    await miniBank.mint(arr1.address, ethers.parseEther("100"));
    await miniBank.connect(arr1).approve(voting.getAddress(), ethers.parseEther("1"));

    // 现在时间还没到 startTime
    await expect(voting.connect(arr1).vote(0, 0))
      .to.be.revertedWith("Voting is not active");
  });

  it("获取 winner - 多票 & 平票比较", async function () {
    const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
    await voting.startVoting(currentTime, currentTime + 1000, "Round3");
    await voting.addCandidate("Alice", 0);
    await voting.addCandidate("Bob", 0);

    // mint后  授权投票，避免5%的限制，给100
    await miniBank.mint(owner.address, ethers.parseEther("100"));
    await miniBank.connect(owner).approve(voting.getAddress(), ethers.parseEther("1"));
    await miniBank.mint(arr1.address, ethers.parseEther("100"));
    await miniBank.connect(arr1).approve(voting.getAddress(), ethers.parseEther("1"));
    await miniBank.mint(arr2.address, ethers.parseEther("100"));
    await miniBank.connect(arr2).approve(voting.getAddress(), ethers.parseEther("1"));
    await miniBank.mint(arr3.address, ethers.parseEther("100"));
    await miniBank.connect(arr3).approve(voting.getAddress(), ethers.parseEther("1"));

    // Alice 得 2 票
    await voting.connect(arr1).vote(0, 0);
    await voting.connect(arr2).vote(0, 0);

    // Bob 得 2 票（但是 Alice 更早投出）
    await voting.connect(arr3).vote(0, 1);
    await voting.connect(owner).vote(0, 1);

    const winner = await voting.getWinner(0);
    expect(winner).to.equal("Alice");
  });

    it("手动结束投票 onlyOwner", async function () {
        const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
        await voting.startVoting(currentTime, currentTime + 1000, "Round4");
        await voting.addCandidate("Alice", 0);
        await voting.addCandidate("Bob", 0);

        // 非 owner 结束投票 -> 报错
        await expect(voting.connect(arr1).endVoting(0))
        .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");

        // owner 结束投票
        await voting.connect(owner).endVoting(0);
        await expect(
            voting.connect(arr2).vote(0, 1)
        ).to.be.revertedWith("Vote is closed");
        // 再结束一次应该报错
        await expect(voting.connect(owner).endVoting(0))
        .to.be.revertedWith("Voting has already ended");
    });
});
