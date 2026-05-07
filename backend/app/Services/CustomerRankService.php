<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Support\CustomerRankDefaults;

class CustomerRankService
{
    public function getRules(): array
    {
        $settings = AppSetting::firstOrCreateSettings();

        return $this->normalizeRules($settings->customer_rank_rules ?? []);
    }

    public function normalizeRules(array $rules): array
    {
        $normalized = [];

        foreach ($rules as $index => $rule) {
            $name = trim((string) data_get($rule, 'name', ''));
            $minPoints = max(0, (int) data_get($rule, 'min_points', 0));

            if ($name === '') {
                continue;
            }

            $normalized[] = [
                'name' => $name,
                'min_points' => $minPoints,
                '_index' => $index,
            ];
        }

        if ($normalized === []) {
            return CustomerRankDefaults::RULES;
        }

        usort($normalized, function (array $left, array $right) {
            if ($left['min_points'] === $right['min_points']) {
                return $left['_index'] <=> $right['_index'];
            }

            return $left['min_points'] <=> $right['min_points'];
        });

        $normalized = array_map(function (array $rule) {
            unset($rule['_index']);
            return $rule;
        }, $normalized);

        if (($normalized[0]['min_points'] ?? 0) > 0) {
            array_unshift($normalized, CustomerRankDefaults::FIRST_RULE);
        }

        return array_values($normalized);
    }

    public function resolveRankName(int $points, ?array $rules = null): string
    {
        $rules = $rules ? $this->normalizeRules($rules) : $this->getRules();
        $resolved = $rules[0]['name'] ?? '';

        foreach ($rules as $rule) {
            if ($points >= (int) ($rule['min_points'] ?? 0)) {
                $resolved = (string) ($rule['name'] ?? $resolved);
            }
        }

        return $resolved;
    }
}
