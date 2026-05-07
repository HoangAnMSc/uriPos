<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductFieldValue extends Model
{
    protected $fillable = [
        'product_id',
        'content_field_id',
        'value',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function contentField()
    {
        return $this->belongsTo(ContentField::class);
    }
}