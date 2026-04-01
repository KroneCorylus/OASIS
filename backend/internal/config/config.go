package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	OpenAIAdminKey   string
	AdminUsername    string
	AdminPassword    string
	JWTSecret        string
	DBPath           string
	PricingPath      string
	Port             string
	AppEnv           string
	SyncLookbackDays int
}

func Load() (Config, error) {
	var errs []error

	required := func(key string) string {
		v := os.Getenv(key)
		if v == "" {
			errs = append(errs, fmt.Errorf("required env var %s is not set", key))
		}
		return v
	}

	optional := func(key, defaultVal string) string {
		if v := os.Getenv(key); v != "" {
			return v
		}
		return defaultVal
	}

	cfg := Config{
		OpenAIAdminKey: required("OPENAI_ADMIN_KEY"),
		AdminUsername:  required("ADMIN_USERNAME"),
		AdminPassword:  required("ADMIN_PASSWORD"),
		JWTSecret:      required("JWT_SECRET"),
		DBPath:         optional("DB_PATH", "./data/usage.db"),
		PricingPath:    optional("PRICING_PATH", "./model-pricing.json"),
		Port:           optional("PORT", "8080"),
		AppEnv:         optional("APP_ENV", "development"),
	}

	lookbackStr := optional("SYNC_LOOKBACK_DAYS", "90")
	days, err := strconv.Atoi(lookbackStr)
	if err != nil {
		errs = append(errs, fmt.Errorf("SYNC_LOOKBACK_DAYS must be an integer, got %q", lookbackStr))
	} else {
		cfg.SyncLookbackDays = days
	}

	if len(errs) > 0 {
		return Config{}, errors.Join(errs...)
	}
	return cfg, nil
}
