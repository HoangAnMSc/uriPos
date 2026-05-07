<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationLike extends Model
{
    protected $fillable = ['notification_id', 'user_id'];
}
