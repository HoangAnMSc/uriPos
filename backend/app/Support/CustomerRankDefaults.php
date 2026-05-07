<?php

namespace App\Support;

class CustomerRankDefaults
{
    public const SPEND_AMOUNT_PER_POINT = 1000;

    public const RULES = [
        ['name' => 'Thanh vien', 'min_points' => 0],
        ['name' => 'Bac', 'min_points' => 100],
        ['name' => 'Vang', 'min_points' => 300],
        ['name' => 'Bach kim', 'min_points' => 600],
        ['name' => 'Kim cuong', 'min_points' => 1000],
    ];

    public const FIRST_RULE = self::RULES[0];
}
