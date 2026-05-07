<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Support\CustomerRankDefaults;

class CustomerPointService
{
    public function getSpendAmountPerPoint(): int
    {
        $settings = AppSetting::firstOrCreateSettings();

        return $this->normalizeSpendAmountPerPoint(
            $settings->customer_point_exchange_amount ?? CustomerRankDefaults::SPEND_AMOUNT_PER_POINT
        );
    }

    public function normalizeSpendAmountPerPoint($value): int
    {
        $amount = (int) $value;

        if ($amount <= 0) {
            return CustomerRankDefaults::SPEND_AMOUNT_PER_POINT;
        }

        return $amount;
    }

    public function calculateEarnedPoints($orderTotal, ?int $spendAmountPerPoint = null): int
    {
        $amount = $this->normalizeSpendAmountPerPoint(
            $spendAmountPerPoint ?? $this->getSpendAmountPerPoint()
        );

        $safeTotal = max(0, (float) $orderTotal);

        return (int) floor($safeTotal / $amount);
    }
}
