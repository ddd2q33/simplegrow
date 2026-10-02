from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./simplegrow.db"

    # Zernio API. Server-side only: it is a bearer key that can read and post to
    # every connected account. Never prefix it with NEXT_PUBLIC_ or expose it
    # through the browser bundle.
    zernio_api_key: str = ""
    zernio_base_url: str = "https://zernio.com/api/v1"

    # Where Zernio sends the browser once an OAuth flow finishes. It appends
    # connected, profileId, accountId and username. Must be reachable from the
    # browser, so it is a frontend URL and not the API URL.
    zernio_redirect_url: str = "http://localhost:3000/dashboard/settings"

    # Zernio profiles group connected accounts. Every connect call needs one, so
    # the backend creates this named profile on first use.
    zernio_default_profile_name: str = "SimpleGrow"

    # Zernio meters requests, not credits: the account plan sets the monthly
    # allowance and the API answers 429 once a per-minute window is spent. The
    # header budget below is what we try not to hit, so a scheduled sync slows
    # itself down instead of failing.
    zernio_requests_per_minute: int = 60
    zernio_min_remaining_requests: int = 8

    # Seconds to wait between calls inside one sync run. Sequential and slow on
    # purpose: the previous provider was credit-billed and tolerated bursts,
    # this one is rate-limited and does not.
    zernio_request_delay_seconds: float = 1.1

    # Background sync. Snapshots only accumulate if something polls on a
    # schedule. Set to 0 to keep the API manual-only.
    zernio_sync_interval_hours: int = 24
    zernio_sync_on_startup: bool = False

    # How much history to pull per account on every run. Zernio keeps 180 days
    # by default, so the first run backfills the whole dashboard range at once.
    zernio_history_days: int = 90

    # Cap on posts stored per account per run, so a brand-new connection cannot
    # write an unbounded number of rows on its first sync.
    zernio_max_posts_per_account: int = 60


settings = Settings()


def has_zernio() -> bool:
    return bool(settings.zernio_api_key.strip())
