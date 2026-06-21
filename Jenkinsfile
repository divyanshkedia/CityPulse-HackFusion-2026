pipeline {
    agent any

    environment {
        DOCKER_IMAGE_FRONTEND = 'meghdoshi/citypulse-frontend'
        DOCKER_IMAGE_BACKEND = 'meghdoshi/citypulse-ml-service'
        REGISTRY_CREDENTIALS = 'dockerhub-credentials'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Frontend Deps') {
                    steps {
                        sh 'npm ci'
                    }
                }
                stage('Backend Deps') {
                    steps {
                        sh 'cd ml-service && pip install -r requirements.txt'
                    }
                }
            }
        }

        stage('Lint & Test') {
            steps {
                sh 'npm run lint --if-present'
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Docker Push') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: "${env.REGISTRY_CREDENTIALS}", passwordVariable: 'DOCKER_HUB_PASSWORD', usernameVariable: 'DOCKER_HUB_USERNAME')]) {
                    sh 'echo $DOCKER_HUB_PASSWORD | docker login -u $DOCKER_HUB_USERNAME --password-stdin'
                    sh "docker build -t ${env.DOCKER_IMAGE_FRONTEND}:${env.BUILD_NUMBER} ."
                    sh "docker build -t ${env.DOCKER_IMAGE_BACKEND}:${env.BUILD_NUMBER} ./ml-service"
                    sh "docker push ${env.DOCKER_IMAGE_FRONTEND}:${env.BUILD_NUMBER}"
                    sh "docker push ${env.DOCKER_IMAGE_BACKEND}:${env.BUILD_NUMBER}"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
