<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'sku',
        'name',
        'thumbnail',
        'content_structure_id',
        'price',
        'quantity',
        'short_desc',
        'publish',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'quantity' => 'integer',
        'publish' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function contentStructure()
    {
        return $this->belongsTo(ContentStructure::class, 'content_structure_id');
    }

    public function fieldValues()
    {
        return $this->hasMany(ProductFieldValue::class);
    }
}