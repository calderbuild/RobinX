const PINATA_GATEWAY = 'https://olive-defensive-giraffe-83.mypinata.cloud'

export interface TokenMetadata {
  name: string
  description: string
  image: string
}

const metadataCache = new Map<string, TokenMetadata>()

function resolveIpfsUrl(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return `${PINATA_GATEWAY}/ipfs/${uri.slice(7)}`
  }
  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    return uri
  }
  return `${PINATA_GATEWAY}/ipfs/${uri}`
}

export async function fetchTokenMetadata(uri: string): Promise<TokenMetadata> {
  const cached = metadataCache.get(uri)
  if (cached) return cached

  const url = resolveIpfsUrl(uri)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status}`)
  }

  const json = await response.json()
  const metadata: TokenMetadata = {
    name: json.name ?? '',
    description: json.description ?? '',
    image: json.image ? resolveIpfsUrl(json.image) : '',
  }

  metadataCache.set(uri, metadata)
  return metadata
}

export function getImageUrl(uri: string): string {
  return resolveIpfsUrl(uri)
}
