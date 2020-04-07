const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
    projectId: 'homeschool-nonprod',
    keyFilename: 'homeschool-nonprod-firebase-adminsdk-7t39y-1c329275cb.json'
});

admin.initializeApp();

exports.addAdminRole = functions.https.onCall((data, context) => {
    return firestore.collection('users')
    .doc(data.uid)
    .get()
    .then(doc => {
      if (!(doc && doc.exists)) {
        return { 
            error: 'Unable to find the document' 
        }
      }
      const docRef = doc.data();
      if (docRef.userType == "teacher") {
        return admin.auth().setCustomUserClaims(data.uid, {admin: true}).then(() => {
            return {
                message: `sucessfully created a custom claim for ${data.uid}`
            }
        }).catch(err =>{
            console.log(err);
            throw new functions.https.HttpsError("internal", "Request caused a server error");
        });
      } else {
        throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
      }
    }).catch(err => {
        console.log(err);
        throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
});

exports.addUserAsAdmin = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
      throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  
  admin.auth().createUser({
      email: data.email,
      emailVerified: false,
      password: data.password,
      displayName: '',
      disabled: false
  }).then(function(userRecord){
      console.log(userRecord);
      return {
          user: userRecord
      }
  }).catch(function(error){
      console.log(error);
      return {
          error: error
      }
      // throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  });
});
