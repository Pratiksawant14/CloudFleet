resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "fleet_storage" {
  bucket        = "${var.project_name}-storage-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "prod"
}

resource "aws_s3_bucket_public_access_block" "fleet_storage" {
  bucket = aws_s3_bucket.fleet_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "fleet_storage" {
  bucket = aws_s3_bucket.fleet_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "enforce_tls" {
  bucket = aws_s3_bucket.fleet_storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLSRequestsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.fleet_storage.arn,
          "${aws_s3_bucket.fleet_storage.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
