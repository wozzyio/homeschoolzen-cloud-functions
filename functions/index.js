const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
    projectId: 'homeschool-nonprod',
    keyFilename: 'homeschool-nonprod-firebase-adminsdk-7t39y-1c329275cb.json'
});

admin.initializeApp();

const db = admin.firestore();

// TODO: udpate the eventual consitency when udating the student by updating the rest of the fields that require the update
// might just have to do this by updating it right away all the fields instead of creating listener cloud functions
// for example teacher will need an update on user as well, student will need an update on teacher and user
// TODO: for currentGradeLevel update the gradeLevel under the student as well (if the document exists just update currentGradeLevel
// otherwise create a new document with the updated gradeLevel being passed in)
// TODO: add functionality to delete student as well

exports.getStudentCollectionDocumentsAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }

  return db.doc(`teachers/${data.uid}/teacherStudents`).listCollections().then((collections) => {
    const collectionIds = collections.map(col => col.id);
    return {
      data: collectionIds,
    }
  }).catch((err) => {
    console.log(err);
    throw new functions.https.HttpsError("internal", "Request caused a server error");
  });
});

// updateStudentEmailPasswordAsTeacher => as a teacher be able to update student email and password
exports.updateStudentEmailPasswordAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }

  if(data.requireStudentEmailUpdate && data.requireStudentPasswordUpdate) {
    return admin.auth().updateUser(data.studentUid, {
      email: data.email,
      password: data.password,
    }).then((userRecord) => {
      return {
        message: `sucessfully updated ${userRecord.uid}`,
        user: userRecord,
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  } else if(data.requireStudentEmailUpdate) {
    return admin.auth().updateUser(data.studentUid, {
      email: data.email,
    }).then((userRecord) => {
      return {
        message: `sucessfully updated email for ${userRecord.uid}`,
        user: userRecord,
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  } else if(data.requireStudentPasswordUpdate) {
    return admin.auth().updateUser(data.studentUid, {
      password: data.password,
    }).then((userRecord) => {
      return {
        message: `sucessfully updated ${userRecord.uid}`,
        user: userRecord,
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  }
});

// updateStudentEmailPasswordAsTeacher => as a teacher be able to update student email and password
exports.updateStudentProfilePicAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  
  return db.collection('students').doc(data.studentUid).update({
    photoURL: data.photoURL,
  }).then(() => {
    db.collection('users').doc(data.uid).get().then(doc => {
      if (!(doc && doc.exists)) {
        return { 
            error: 'Unable to find the document' 
        }
      }
      console.log("Document requested: " + doc.toString());
      console.log("Document requested .data(): " + doc.data().toString());
      const docRef = doc.data();
      const teacherStudentLength = docRef.data.teacherStudents.length;
      let count = 0;
      for (let i = 0; i < teacherStudentLength; i++) {
        if(docRef.data.teacherStudents.uid === data.uid){
          break;
        }
        count++;
      }
      return db.collection('users').doc(`${data.uid}/teacherStudents[${count}]`).update({
        photoURL: data.photoURL,
      }).then(() => {
        return {
          message: 'update users teacherStudents sucessful',
        }
      }).catch((err) => {
        return { 
          error: `Unable to find the document ${err}`, 
        }
      });
    });

    console.log('updating students photoURL sucessfully');
    return {
      message: `sucessfully updated students photoURL for ${data.uid}`
    }
  }).catch((err) => {
    console.log(err);
    throw new functions.https.HttpsError("internal", "Request caused a server error");
  });
});

/* updateStudentNameGradeAsTeacher => as a teacher be able to update student Name and Grade information */
exports.updateStudentNameGradeAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }

  if(data.requireStudentNameUpdate && data.requireStudentGradeUpdate) {
    return db.collection('students').doc(data.studentUid).update({
      displayName: data.displayName,
      currentGradeLevel: data.currentGradeLevel,
    }).then((result) => {
      console.log('updating both students name and grade');
      return {
        message: `sucessfully updated students name and grade for ${data.uid}`
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  } else if(data.requireStudentNameUpdate) {
    return db.collection('students').doc(data.studentUid).update({
      displayName: data.displayName,
    }).then((result) => {
      console.log('updating students name');
      return {
        message: `sucessfully updated students name for ${data.uid}`
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  } else if(data.requireStudentGradeUpdate) {
    return db.collection('students').doc(data.studentUid).update({
      currentGradeLevel: data.currentGradeLevel,
    }).then((result) => {
      console.log('updating student grade');
      return {
        message: `sucessfully updated students grade for ${data.uid}`
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  }
});

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
      displayName: data.displayName,
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
        displayName: data.displayName,
        userType: 'student',
        isNewUser: true,
        uid: userRecord.uid,
        teacherUid: data.uid
      });
      // creating the student collection is generated below with createUser of userType of student
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
//   if (context.auth.uid != data.uid){
//     throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
//   }
  returnRecord = null;
  return db.collection('teachers').doc(data.uid).set({
    uid: data.uid,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    email: data.email,
    emailVerified: data.emailVerified,
    isNewUser: data.isNewUser,
    teacherStudents: data.teacherStudents,
    teacherName: data.teacherName,
    homeSchoolName: data.homeSchoolName,
    userType: "teacher"
  }).then(function(teacherRecord){
    console.log(teacherRecord);
    returnRecord = teacherRecord;
    return db.collection('users').doc(data.uid)
    .set({
        uid: data.uid,
        displayName: data.displayName,
        photoUrl: data.photoUrl,
        email: data.email,
        emailVerified: data.emailVerified,
        isNewUser: data.isNewUser,
        teacherStudents: data.teacherStudents,
        teacherName: data.teacherName,
        homeSchoolName: data.homeSchoolName,
        userType: "teacher"
    });
  }).then(function(){
    return {
        message: `Created a teacher record and updated users record sucessfully with ${returnRecord.uid}`
    }
  }).catch(function(err){
    console.log(err);
    return {
        err: err
    }
  });
});

exports.getStudentDocumentAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  return db.collection('students').doc(data.studentUid).get().then(doc => {
    if (!(doc && doc.exists)) {
      return { 
          error: 'Unable to find the document' 
      }
    }
    console.log("Document requested: " + doc.toString());
    console.log("Document requested .data(): " + doc.data().toString());
    const docRef = doc.data();
    return {
      data: docRef
    }
  }).catch(err => {
    console.log(err);
    throw new functions.https.HttpsError("internal", "Request caused a server error");
  });
});

exports.notAttendingStudent = functions.https.onCall((data, context) => {
    // need data.reason, data.uid, data.studentUids, data.datesString
    // datesString: => 2020-04-29,2020-04-30
    var listDate = [];
    var startDate = data.datesString.split(",")[0];
    var endDate = data.datesString.split(",")[1];
    var dateMove = new Date(startDate);
    var strDate = startDate;

    while (strDate < endDate){
        var strDate = dateMove.toISOString().slice(0,10);
        listDate.push(strDate);
        dateMove.setDate(dateMove.getDate()+1);
    };
    if(data.studentUids.length > 1) {
        data.studentUids.forEach((studentUid) => {
            listDate.forEach((date) => {
                return db.collection('attendance').doc(studentUid).collection(date).doc(studentUid).set({
                    teacherUid: data.uid,
                    isPresent: false,
                    reason: data.reason,
                    studentUid: studentUid,
                }).then((attendanceRecord) => {
                    console.log(attendanceRecord);
                }).catch(err => {
                    console.log(err);
                });
            });
        });
        return {
            success: `attendance recorded successfully`
        }
    } else {
        listDate.forEach((date) => {
            return db.collection('attendance').doc(data.studentUids[0]).collection(date).doc(data.studentUids[0]).set({
                teacherUid: data.uid,
                isPresent: false,
                reason: data.reason,
                studentUid: data.studentUids[0],
            }).then((attendanceRecord) => {
                console.log(attendanceRecord);
            }).catch(err => {
                console.log(err);
            });
        });
        return {
            success: `attendance recorded successfully`
        }
    }
});

/* onCreation of user with the userType of student */
exports.createUser = functions.firestore.document('users/{userId}').onCreate((snap, context) => {
  const newValue = snap.data();
  if (newValue.userType == "student") {
    return db.collection('students').doc(newValue.uid).set({ 
      displayName: newValue.displayName,
      email: newValue.email,
      emailVerified: newValue.emailVerified,
      isNewUser: newValue.isNewUser,
      photoURL: newValue.photoURL,
      teacherUid: newValue.teacherUid,
      uid: newValue.uid,
      userType: "student"
    }).then((userRecord) => {
      console.log(userRecord);
      return {
        user: userRecord
      }
    }).catch(err => {
      console.log(err);
    });
  }
});

/* onUpdate of teachers we want to update the user of userType teacher collection as well */
exports.onUpdateTeacherUser = functions.firestore.document('teachers/{teacherId}').onUpdate((snap, context) => {
  const newValue = snap.data();
  return db.collection('users').doc(newValue.uid).set({ 
      displayName: newValue.displayName,
      email: newValue.email,
      emailVerified: newValue.emailVerified,
      isNewUser: newValue.isNewUser,
      photoURL: newValue.photoURL,
      teacherUid: newValue.teacherUid,
      uid: newValue.uid,
      userType: "student"
  })
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
// exports.onCreateTeacherUser = functions.firestore.document('teachers/{teacherId}').onCreate((snap, context) => {
//     const newValue = snap.data();
//     return db.collection('users').doc(newValue.uid).set({ newValue })
//     .then((userRecord) => {
//       console.log(userRecord);
//       return {
//         user: userRecord
//       }
//     }).catch(err => {
//       console.log(err);
//     });
// });

// addTeacherDocuments for the user teacher doc
