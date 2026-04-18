# Cloudflare KV Adapter for Payload CMS

This adapter allows you to use Cloudflare KV as a key-value database for Payload CMS.

## Installation

```sh
pnpm add @zapal/payload-kv-cloudflare
```

## Usage

- Pass the KV namespace binding to the adapter, either directly, through `@opennext/cloudflare`, or through `wrangler`
- Configure your Payload config
- That's it

```ts
// payload.config.js
import { cloudflareKVAdapter } from '@zapal/payload-kv-cloudflare'

export default buildConfig({
  kv: cloudflareKVAdapter({
    kv: cloudflareContext.env.KV, // required; Pass the KV namespace binding to the adapter
    kvPrefix: 'kv:', // optional; 'payload-kv:' is used by default
  }),
})
```

## Passing the KV namespace binding with `@opennext/cloudflare` and `wrangler`

In development, the adapter will attempt to get the KV namespace binding from `@opennext/cloudflare` and fall back to `wrangler`
if it detects a `generate` or `migrate` command. In production, it will attempt to get the KV namespace binding from
`@opennext/cloudflare` and fall back to `wrangler` if `shouldUseCloudflareRemoteBindings` is false.

This allows you to use `@opennext/cloudflare` in production without having to worry about `wrangler` and allows you to use
`wrangler` in development without having to worry about `@opennext/cloudflare`.

> **Disclaimer**: The code snippet below is provided as an example of how to implement the logic for getting the KV namespace
> binding from `@opennext/cloudflare` and `wrangler`. It is not meant to be used as-is and may require additional configuration
> and error handling to work properly in your specific use case.

```ts
// cloudflare.ts
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'

const shouldUseCloudflareRemoteBindings = process.env.NODE_ENV !== 'development'

export const cloudflareContext =
  process.argv.find((value) => value.match(/^(generate|migrate):?/)) || !shouldUseCloudflareRemoteBindings
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

async function getCloudflareContextFromWrangler<
  CfProperties extends Record<string, unknown> = IncomingRequestCfProperties,
  Context = ExecutionContext,
>(options?: GetPlatformProxyOptions): Promise<CloudflareContext<CfProperties, Context>> {
  // We never want `wrangler` to be bundled in our Next.js/PayloadCMS app, that's why the import below looks like it does
  const { getPlatformProxy } = await import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`)

  // This allows the selection of a `wrangler` environment while running in `next` development mode
  const environment = options?.environment ?? process.env.CLOUDFLARE_ENV

  const { env, cf, ctx } = await getPlatformProxy({
    ...options,
    environment,
    experimental: { remoteBindings: shouldUseCloudflareRemoteBindings },
  } satisfies GetPlatformProxyOptions)

  return {
    env,
    cf: cf as unknown as CfProperties,
    ctx: ctx as Context,
  }
}
```
