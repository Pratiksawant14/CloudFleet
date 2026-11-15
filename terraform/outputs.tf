output "api_endpoint" {
  description = "Base URL of the CloudFleet API Gateway HTTP endpoint"
  value       = aws_apigatewayv2_stage.default_stage.invoke_url
}

output "s3_bucket_name" {
  description = "Name of the S3 storage bucket"
  value       = aws_s3_bucket.fleet_storage.id
}

output "lambda_function_name" {
  description = "Name of the backend Lambda function"
  value       = aws_lambda_function.api_backend.function_name
}

