import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { json } from '@helia/json';
import { CID } from 'multiformats/cid';

let heliaInstance: any = null;

export async function getHelia() {
  if (!heliaInstance) {
    heliaInstance = await createHelia();
  }
  return heliaInstance;
}

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    const helia = await getHelia();
    const fs = unixfs(helia);
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const cid = await fs.addFile({ 
      path: file.name,
      content: uint8Array 
    });
    return cid.toString();
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

export async function uploadJSONToIPFS(data: any): Promise<string> {
  try {
    const helia = await getHelia();
    const j = json(helia);
    
    const cid = await j.add(data);
    return cid.toString();
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    throw error;
  }
}

export async function getFromIPFS(cidString: string): Promise<any> {
  try {
    const helia = await getHelia();
    const j = json(helia);
    
    const cid = CID.parse(cidString);
    const data = await j.get(cid);
    return data;
  } catch (error) {
    console.error('Error getting from IPFS:', error);
    throw error;
  }
}

export async function getFileFromIPFS(cidString: string): Promise<Uint8Array> {
  try {
    const helia = await getHelia();
    const fs = unixfs(helia);
    
    const cid = CID.parse(cidString);
    const chunks: Uint8Array[] = [];
    for await (const chunk of fs.cat(cid)) {
      chunks.push(chunk);
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  } catch (error) {
    console.error('Error getting file from IPFS:', error);
    throw error;
  }
}

export function getIPFSGatewayUrl(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`;
}
