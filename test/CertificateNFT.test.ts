import { expect } from 'chai';
import hre from 'hardhat';
const { ethers } = hre;
import { CertificateNFT } from '../typechain-types';

describe('CertificateNFT', function () {
  let nft: CertificateNFT;
  let owner: any;
  let freelancer: any;
  let client: any;

  beforeEach(async function () {
    [owner, freelancer, client] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('CertificateNFT');
    nft = (await Factory.deploy(
      'BlockFreelancer Certificates',
      'BFC',
      'https://api.blockfreelancer.com/metadata'
    )) as CertificateNFT;
  });

  it('mints a certificate when called by owner', async function () {
    const tx = await nft.mintCertificate(
      freelancer.address,
      client.address,
      1,
      'Project Title',
      'Description',
      'Solidity',
      ethers.parseEther('0.1'),
      4,
      'QmHash'
    );
    await expect(tx).to.emit(nft, 'CertificateMinted');

  const total = await nft.totalSupply();
  expect(Number(total)).to.equal(1);

    const tokenURI = await nft.tokenURI(1);
    expect(tokenURI).to.include('metadata');
  });
});
