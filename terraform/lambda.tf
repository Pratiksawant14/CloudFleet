data "archive_file" "backend_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/dist"
  output_path = "${path.module}/build/backend_lambda.zip"
}

resource "aws_lambda_function" "api_backend" {
  function_name    = "${var.project_name}-api-${var.environment}"
  description      = "CloudFleet Serverless Backend API Handler"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handlers/api.handler"
  runtime          = "nodejs20.x"
  timeout          = 15
  memory_size      = 256

  filename         = data.archive_file.backend_lambda_zip.output_path
  source_code_hash = data.archive_file.backend_lambda_zip.output_base64sha256

  environment {
    variables = {
      S3_BUCKET_NAME = aws_s3_bucket.fleet_storage.id
      NODE_ENV       = "production"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_s3,
    aws_iam_role_policy_attachment.lambda_logging
  ]
}
