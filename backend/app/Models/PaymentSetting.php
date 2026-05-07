<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = [
        'bank_name',
        'account_name',
        'account_number',
        'qr_image'
    ];
}