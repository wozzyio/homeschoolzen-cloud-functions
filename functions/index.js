const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
    projectId: 'homeschool-nonprod',
    keyFilename: 'homeschool-nonprod-firebase-adminsdk-7t39y-1c329275cb.json'
});

admin.initializeApp();

const db = admin.firestore();

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
  
  returnRecord = null;
  return admin.auth().createUser({
      email: data.email,
      emailVerified: false,
      password: data.password,
      displayName: '',
      disabled: false
  }).then(function(userRecord){
      console.log(userRecord);
      returnRecord = userRecord;
      // create the user collection and document
      return db.collection('users').doc(userRecord.uid)
      .set({
        email: data.email,
        emailVerified: false,
        photoURL: null,
        displayName: null,
        disabled: false,
        userType: 'student',
        isNewUser: true,
        uid: userRecord.uid,
        teacherUid: data.uid
      });
      // create the student collection and document
  }).then(function(){
      return {
        user: returnRecord
      }
  }).catch(function(error){
      console.log(error);
      return {
          error: error
      }
      // throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  });
});

exports.addTeacherDocuments = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  return db.collection('teachers').doc(data.uid).set({
    uid: data.uid,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    email: data.email,
    emailVerified: data.emailVerified,
    isNewUser: data.isNewUser,
    teacherStudents: data.teacherStudents,
    teacherName: data.teacherName,
    homeSchoolName: data.homeSchoolName
  }).then((teacherRecord) => {
    console.log(teacherRecord);
    return {
        message: `Sucessfully created teacher document with uid of ${teacherRecord.uid}`
    }
  }).catch(err => {
    console.log(err);
  });
});

/* onCreation of user with the userType of student */
exports.createUser = functions.firestore.document('users/{userId}').onCreate((snap, context) => {
    const newValue = snap.data();
    if (newValue.userType == "student") {
      return db.collection('students').doc(newValue.uid).set({ newValue })
      .then((userRecord) => {
        console.log(userRecord);
        return {
          user: userRecord
        }
      }).catch(err => {
        console.log(err);
      });
    }
});

/* onUpdate of teachers we want to update the teacher user document as well */
exports.onUpdateTeacherUser = functions.firestore.document('teachers/{teacherId}').onUpdate((snap, context) => {
    const newValue = snap.data();
    return db.collection('users').doc(newValue.uid).set({ newValue })
    .then((userRecord) => {
      console.log(userRecord);
      return {
        user: userRecord
      }
    }).catch(err => {
      console.log(err);
    });
});

/* onCreate of teachers we want to update the teacher user document as well */
exports.onCreateTeacherUser = functions.firestore.document('teachers/{teacherId}').onCreate((snap, context) => {
    const newValue = snap.data();
    return db.collection('users').doc(newValue.uid).set({ newValue })
    .then((userRecord) => {
      console.log(userRecord);
      return {
        user: userRecord
      }
    }).catch(err => {
      console.log(err);
    });
});
