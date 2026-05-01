@description('Azure region for the MVP handoff resources.')
param location string = resourceGroup().location

@description('Globally unique storage account name, 3-24 lowercase letters and numbers.')
param storageAccountName string

@description('Queue that receives approved Hermes worker run payloads.')
param queueName string = 'approved-worker-runs'

@description('Blob container for uploaded source files.')
param inputsContainerName string = 'inputs'

@description('Blob container for generated artifacts.')
param outputsContainerName string = 'outputs'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  name: 'default'
  parent: storageAccount
}

resource inputsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: inputsContainerName
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

resource outputsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: outputsContainerName
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  name: 'default'
  parent: storageAccount
}

resource workerQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = {
  name: queueName
  parent: queueService
}

output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output queueName string = workerQueue.name
output inputsContainerName string = inputsContainer.name
output outputsContainerName string = outputsContainer.name
