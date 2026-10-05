import jwt
import hashlib
from functools import wraps
from flask import request, jsonify, current_app

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2:
                token = parts[1]
        
        if not token:
            return jsonify({'erro': 'Token ausente. Faça login.'}), 401
            
        try:
            # Usamos o current_app para pegar a chave secreta do aplicativo principal
            dados = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            kwargs['usuario_logado'] = dados 
        except Exception as e:
            return jsonify({'erro': 'Token inválido ou expirado.'}), 401
            
        return f(*args, **kwargs)
    return decorated